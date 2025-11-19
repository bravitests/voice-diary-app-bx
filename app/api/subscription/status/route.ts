import { type NextRequest, NextResponse } from "next/server"
import { getUserSubscriptionStatus } from "@/lib/subscription"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    // Get database subscription status
    const dbStatus = await getUserSubscriptionStatus(userId)

    const response: any = {
      database: dbStatus,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Subscription status API error:", error)
    return NextResponse.json({
      error: "Failed to fetch subscription status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}