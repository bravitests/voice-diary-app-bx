import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId, purpose: purposeId, title } = await request.json()

    if (!userId || !purposeId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const session = await db.createChatSession(userId, purposeId, title)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Chat session API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}