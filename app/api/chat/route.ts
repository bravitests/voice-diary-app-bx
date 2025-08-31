import { NextRequest, NextResponse } from "next/server"
import { checkUsageLimit } from "@/lib/subscription"
import { generateChatResponse } from "@/lib/gemini-ai"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { messages, purpose, userId, sessionId } = await request.json()

    if (!messages || !purpose || !userId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check usage limits
    const limitCheck = await checkUsageLimit(userId, "chat")
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 429 })
    }

    // Get user's recordings for context
    const recordings = await db.getUserRecordings(userId, purpose)
    
    // Create context from recordings
    const context = recordings
      .filter(r => r.transcript)
      .map(r => `Entry: ${r.transcript}\nSummary: ${r.summary || 'No summary'}\nInsights: ${r.ai_insights || 'No insights'}`)
      .join('\n\n')

    // Generate AI response
    const systemPrompt = `You are a helpful AI assistant for a voice diary app. The user is asking about their ${purpose} entries. 
    
Here are their relevant diary entries for context:
${context}

Provide thoughtful, empathetic responses that help them reflect on their entries and gain insights. Keep responses conversational and supportive.`

    const result = await generateChatResponse(messages, purpose, userId, recordings)
    const response = result.response

    // Save the conversation
    await db.addChatMessage(sessionId, "user", messages[messages.length - 1].content)
    await db.addChatMessage(sessionId, "assistant", response)

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}