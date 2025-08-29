import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId, purpose, title } = await request.json()

    if (!userId || !purpose || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const session = await db.createChatSession(userId, purpose, title)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("[v0] Create chat session API error:", error)
    return NextResponse.json({ error: "Failed to create chat session" }, { status: 500 })
  }
}
