import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const purposeId = searchParams.get("purposeId")

    if (!userId || !purposeId) {
      return NextResponse.json({ error: "Missing userId or purposeId" }, { status: 400 })
    }

    const session = await db.getLatestChatSession(userId, purposeId)
    
    return NextResponse.json({ session })
  } catch (error) {
    console.error("Get chat sessions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}