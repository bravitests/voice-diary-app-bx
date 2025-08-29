import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const purpose = searchParams.get("purpose")

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    const recordings = await db.getUserRecordings(userId, purpose === "all" ? undefined : purpose)

    return NextResponse.json({ recordings })
  } catch (error) {
    console.error("[v0] Get recordings API error:", error)
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 })
  }
}
