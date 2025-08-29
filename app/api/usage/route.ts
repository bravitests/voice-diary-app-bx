import { type NextRequest, NextResponse } from "next/server"
import { getUserUsageStats } from "@/lib/subscription"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    const usage = await getUserUsageStats(userId)

    return NextResponse.json(usage)
  } catch (error) {
    console.error("[v0] Get usage API error:", error)
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 })
  }
}
