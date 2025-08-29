import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { audioStorage } from "@/lib/audio-storage"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const walletAddress = formData.get("walletAddress") as string
    const purposeId = formData.get("purposeId") as string
    const duration = Number.parseInt(formData.get("duration") as string)
    const audioFile = formData.get("audio") as File

    if (!walletAddress || !purposeId || !duration || !audioFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user ID
    const userResult = await query("SELECT id FROM users WHERE wallet_address = $1", [walletAddress])
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const userId = userResult.rows[0].id

    // Get purpose name for filename
    const purposeResult = await query("SELECT name FROM purposes WHERE id = $1", [purposeId])
    const purposeName = purposeResult.rows[0]?.name || "unknown"

    // Upload audio file
    const filename = audioStorage.generateFilename(userId, purposeName)
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type })
    const audioUrl = await audioStorage.uploadAudio(audioBlob, filename)

    // Create recording record in database
    const result = await query(
      `
      INSERT INTO recordings (user_id, purpose_id, audio_url, audio_duration, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, created_at
    `,
      [userId, purposeId, audioUrl, duration],
    )

    const recording = result.rows[0]

    return NextResponse.json({
      recordingId: recording.id,
      audioUrl,
      createdAt: recording.created_at,
    })
  } catch (error) {
    console.error("Create recording API error:", error)
    return NextResponse.json({ error: "Failed to create recording" }, { status: 500 })
  }
}
