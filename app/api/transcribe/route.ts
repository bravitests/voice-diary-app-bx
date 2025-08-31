import { type NextRequest, NextResponse } from "next/server"
import { rateLimitMiddleware, systemMonitor, geminiCircuitBreaker } from "@/lib/rate-limiter"
import { transcribeAudio, generateSummaryFromAudio } from "@/lib/gemini-ai"
import { updateRecordingTranscript, trackApiUsage } from "@/lib/database"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let success = false

  try {
    const formData = await request.formData()
    const recordingId = formData.get("recordingId") as string
    const audioUrl = formData.get("audioUrl") as string
    const walletAddress = formData.get("walletAddress") as string
    const subscriptionTier = (formData.get("subscriptionTier") as "free" | "pro") || "free"

    if (!recordingId || !audioUrl || !walletAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Simple rate limiting check
    const { checkRateLimit } = await import("@/lib/simple-rate-limiter")
    if (!checkRateLimit(walletAddress, 30)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Fetch the audio file from the URL
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error("Failed to fetch audio file")
    }
    
    const arrayBuffer = await audioResponse.arrayBuffer()
    const audioBlob = new Blob([arrayBuffer], { type: "audio/webm" })

    // Process transcription and summary in parallel for better performance
    const [transcriptionResult, summaryResult] = await Promise.all([
      geminiCircuitBreaker.execute(async () => {
        return await transcribeAudio(audioBlob, walletAddress, subscriptionTier)
      }),
      // Generate summary from audio directly instead of waiting for transcript
      geminiCircuitBreaker.execute(async () => {
        return await generateSummaryFromAudio(audioBlob, walletAddress, subscriptionTier)
      })
    ])

    // Update recording in database with both transcript and summary
    await updateRecordingTranscript(
      recordingId, 
      transcriptionResult.transcript, 
      summaryResult.summary, 
      summaryResult.insights
    )

    // Track API usage for both calls
    const totalTokensUsed = transcriptionResult.tokensUsed + summaryResult.tokensUsed
    const totalCost = transcriptionResult.cost + summaryResult.cost
    await trackApiUsage(walletAddress, "transcription", totalTokensUsed, totalCost)

    success = true
    console.log("[v0] Transcription API completed", { 
      walletAddress, 
      recordingId, 
      transcriptionTokens: transcriptionResult.tokensUsed,
      summaryTokens: summaryResult.tokensUsed,
      totalTokens: totalTokensUsed
    })

    return NextResponse.json({
      success: true,
      transcript: transcriptionResult.transcript,
      summary: summaryResult.summary,
      insights: summaryResult.insights,
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
