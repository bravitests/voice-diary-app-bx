import { type NextRequest, NextResponse } from "next/server"
import { requestQueue, rateLimitMiddleware, systemMonitor, geminiCircuitBreaker } from "@/lib/rate-limiter"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let success = false

  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const userId = formData.get("userId") as string
    const recordingId = formData.get("recordingId") as string
    const subscriptionTier = formData.get("subscriptionTier") as "free" | "pro"

    if (!audioFile || !userId || !recordingId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check rate limiting
    const rateLimitAllowed = await rateLimitMiddleware(userId, "transcription")
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Convert file to blob
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBlob = new Blob([arrayBuffer], { type: audioFile.type })

    // Add to request queue with circuit breaker
    const result = await geminiCircuitBreaker.execute(async () => {
      return await requestQueue.addRequest(
        userId,
        "transcription",
        { audioBlob, subscriptionTier },
        subscriptionTier === "pro" ? 2 : 1, // Higher priority for pro users
      )
    })

    // Update recording in database
    await db.updateRecordingTranscript(recordingId, result.transcript, result.summary, result.insights)

    // Track API usage
    await db.trackApiUsage(userId, "transcription", result.tokensUsed, result.cost)

    success = true
    console.log("[v0] Transcription API completed", { userId, recordingId, tokensUsed: result.tokensUsed })

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      summary: result.summary,
      insights: result.insights,
    })
  } catch (error) {
    console.error("[v0] Transcription API error", error)

    if (error instanceof Error && error.message === "Circuit breaker is open") {
      return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 },
    )
  } finally {
    const responseTime = Date.now() - startTime
    systemMonitor.recordRequest(success, responseTime)
  }
}
