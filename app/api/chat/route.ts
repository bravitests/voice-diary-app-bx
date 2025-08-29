import { type NextRequest, NextResponse } from "next/server"
import { requestQueue, rateLimitMiddleware, systemMonitor, geminiCircuitBreaker } from "@/lib/rate-limiter"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let success = false

  try {
    const { messages, purpose, userId, sessionId } = await request.json()

    if (!messages || !purpose || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check rate limiting
    const rateLimitAllowed = await rateLimitMiddleware(userId, "chat")
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Get user's recordings for context
    const userRecordings = await db.getUserRecordings(userId, purpose)

    // Get user subscription tier for priority
    const userResult = await db.query("SELECT subscription_tier FROM users WHERE id = $1", [userId])
    const subscriptionTier = userResult.rows[0]?.subscription_tier || "free"

    // Add to request queue with circuit breaker
    const result = await geminiCircuitBreaker.execute(async () => {
      return await requestQueue.addRequest(
        userId,
        "chat",
        { messages, purpose, userRecordings },
        subscriptionTier === "pro" ? 2 : 1, // Higher priority for pro users
      )
    })

    // Save messages to database if sessionId provided
    if (sessionId) {
      // Save user message
      await db.addChatMessage(sessionId, "user", messages[messages.length - 1].content)

      // Save AI response
      await db.addChatMessage(sessionId, "assistant", result.response)
    }

    // Track API usage
    await db.trackApiUsage(userId, "chat", result.tokensUsed, result.cost)

    success = true
    console.log("[v0] Chat API completed", { userId, purpose, tokensUsed: result.tokensUsed })

    return NextResponse.json({
      success: true,
      response: result.response,
    })
  } catch (error) {
    console.error("[v0] Chat API error", error)

    if (error instanceof Error && error.message === "Circuit breaker is open") {
      return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 })
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Chat failed" }, { status: 500 })
  } finally {
    const responseTime = Date.now() - startTime
    systemMonitor.recordRequest(success, responseTime)
  }
}
