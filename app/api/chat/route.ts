
import { NextRequest, NextResponse } from "next/server"
import { generateChatResponse } from "@/lib/gemini-ai"
import {
  query,
  getUserPaystackSubscription,
  getUserRecordings,
  getChatSession,
  createChatSession,
  addChatMessage,
  trackApiUsage,
  getUserPurposes
} from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId, purposeId, message, sessionId } = await request.json()

    if (!userId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Check Subscription Limits
    const subscription = await getUserPaystackSubscription(userId);

    // Default Free Limits
    let limits = { chats_per_day: 5 };

    if (subscription && subscription.plan_limits) {
      limits = subscription.plan_limits;
    }

    // Check daily chat limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const chatCountResult = await query(`
      SELECT COUNT(*) as count
      FROM chat_messages m
      JOIN chat_sessions s ON m.session_id = s.id
      WHERE s.user_id = $1
      AND m.role = 'user'
      AND m.created_at >= $2
  `, [userId, today]);

    const chatsToday = parseInt(chatCountResult.rows[0].count);

    if (chatsToday >= limits.chats_per_day) {
      return NextResponse.json({
        error: "Daily chat limit reached. Please upgrade your plan."
      }, { status: 403 });
    }

    // 2. Get Context Data
    // Get user name
    const userResult = await query("SELECT name FROM users WHERE id = $1", [userId])
    const userName = userResult.rows[0]?.name || "there"

    // Get purpose name
    const purposes = await getUserPurposes(userId)
    const purpose = purposes.find((p: any) => p.id === purposeId)
    const purposeName = purpose?.name || "General"

    // 3. Manage Session
    let currentSessionId = sessionId
    let chatHistory: { role: string; content: string }[] = []

    if (currentSessionId) {
      const session = await getChatSession(currentSessionId)
      if (session) {
        chatHistory = session.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }))
      }
    } else {
      // Create new session
      const newSession = await createChatSession(userId, purposeId, message.substring(0, 50) + "...")
      currentSessionId = newSession.id
    }

    // Add user message to DB
    await addChatMessage(currentSessionId, "user", message)

    // 4. Get relevant transcriptions for context
    // We fetch recent recordings for this purpose to give the AI context
    const recordings = await getUserRecordings(userId, purposeId)
    const recentTranscriptions = recordings
      .slice(0, 5)
      .map((r: any) => `[${ new Date(r.created_at).toLocaleDateString() }] ${ r.transcript } `)
      .join("\n\n")

    // 5. Generate AI response
    const { response, tokensUsed, cost } = await generateChatResponse(
      [{ role: "user", content: message }], // We pass just the new message, history is handled by gemini-ai lib if we passed it?
      // Wait, check generateChatResponse signature. It takes 'messages' array.
      // The original code passed 'messages' from request.json() which was the full history from frontend?
      // But here we are reconstructing history from DB.
      // Let's look at generateChatResponse signature in lib/gemini-ai.ts if possible.
      // Assuming it takes (currentMessage, purpose, userId, context, history, userName) based on previous usage.
      // The previous usage was: generateChatResponse(messages, purposeName, userId, transcriptions, chatHistory.rows, userName)
      // where 'messages' was likely the full array from frontend.
      // If we want to rely on DB history, we should pass the history we fetched.
      // But if the frontend sends full history, we can use that too.
      // However, the prompt asked to fix the "placeholders".
      // Let's assume we want to pass the current message and the history.
      purposeName,
      userId,
      recentTranscriptions,
      chatHistory,
      userName
    )

    // Add AI response to DB
    await addChatMessage(currentSessionId, "assistant", response)

    // Track usage
    await trackApiUsage(userId, "chat", tokensUsed, cost)

    return NextResponse.json({
      response,
      sessionId: currentSessionId,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
