import { NextRequest, NextResponse } from "next/server"
import { checkUsageLimit } from "@/lib/subscription"
import { generateChatResponse } from "@/lib/gemini-ai"
import { db, query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { messages, purpose: purposeId, userId, sessionId } = await request.json()

    if (!messages || !purposeId || !userId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user info
    const userResult = await query("SELECT name FROM users WHERE id = $1", [userId])
    const userName = userResult.rows[0]?.name || "there"

    // Get purpose name
    const purposes = await db.getUserPurposes(userId)
    const purpose = purposes.find(p => p.id === purposeId)
    const purposeName = purpose?.name || "Unknown Purpose"

    // Get last 10 transcriptions for this purpose only
    const recordings = await query(`
      SELECT transcript FROM recordings 
      WHERE user_id = $1 AND purpose_id = $2 AND transcript IS NOT NULL 
      ORDER BY created_at DESC LIMIT 10
    `, [userId, purposeId])
    
    const transcriptions = recordings.rows.map(r => r.transcript).join('\n\n')

    // Get chat history for this purpose
    const chatHistory = await query(`
      SELECT role, content FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = $1 AND cs.purpose_id = $2
      ORDER BY cm.created_at ASC
    `, [userId, purposeId])

    // Generate AI response with proper system instruction
    const result = await generateChatResponse(
      messages, 
      purposeName, 
      userId, 
      transcriptions,
      chatHistory.rows,
      userName
    )
    
    // Save the conversation
    await db.addChatMessage(sessionId, "user", messages[messages.length - 1].content)
    await db.addChatMessage(sessionId, "assistant", result.response)

    // Track API usage
    await db.trackApiUsage(userId, "chat", result.tokensUsed, result.cost)

    return NextResponse.json({ response: result.response })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}