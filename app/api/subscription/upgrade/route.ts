import { type NextRequest, NextResponse } from "next/server"
import { upgradeSubscription } from "@/lib/subscription"

export async function POST(request: NextRequest) {
  try {
    const { userId, tier, transactionHash, amountPaid } = await request.json()

    if (!userId || !tier || !transactionHash || !amountPaid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (tier !== "pro") {
      return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 })
    }

    const success = await upgradeSubscription(userId, tier, transactionHash, amountPaid)

    if (success) {
      return NextResponse.json({ success: true, message: "Subscription upgraded successfully" })
    } else {
      return NextResponse.json({ error: "Failed to upgrade subscription" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Subscription upgrade API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
