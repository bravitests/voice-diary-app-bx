import { NextRequest, NextResponse } from "next/server"
import { checkUsageLimit } from "@/lib/subscription"
import { generateChatResponse } from "@/lib/gemini-ai"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { messages, purpose: purposeId, userId, sessionId } = await request.json()

    if (!messages || !purposeId || !userId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user's recordings for this purpose
    const recordings = await db.getUserRecordings(userId, purposeId)
    
    // Get purpose name
    const purposes = await db.getUserPurposes(userId)
    const purpose = purposes.find(p => p.id === purposeId)
    const purposeName = purpose?.name || "Unknown Purpose"

    // Generate AI response using the same flow as journalmine-main
    const result = await generateChatResponse(messages, purposeName, userId, recordings)
    const response = result.response

    // Save the conversation
    await db.addChatMessage(sessionId, "user", messages[messages.length - 1].content)
    await db.addChatMessage(sessionId, "assistant", response)

    // Track API usage
    await db.trackApiUsage(userId, "chat", result.tokensUsed, result.cost)

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}