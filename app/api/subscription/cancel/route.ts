import { type NextRequest, NextResponse } from "next/server"
import { cancelSubscription } from "@/lib/subscription"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    const success = await cancelSubscription(userId)

    if (success) {
      return NextResponse.json({ success: true, message: "Subscription cancelled successfully" })
    } else {
      return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Subscription cancel API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
