import { type NextRequest, NextResponse } from "next/server"
import { upgradeSubscription } from "@/lib/subscription"
import { BillingService } from "@/lib/billing-service"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId, tier, transactionHash, amountPaid, walletAddress, expiryDate } = await request.json()

    // Validate required fields
    if (!userId || !tier || !transactionHash) {
      return NextResponse.json({ 
        error: "Missing required fields",
        details: "userId, tier, and transactionHash are required" 
      }, { status: 400 })
    }

    if (tier !== "pro") {
      return NextResponse.json({ 
        error: "Invalid subscription tier",
        details: "Only 'pro' tier is supported" 
      }, { status: 400 })
    }

    // Verify user exists
    const userResult = await query("SELECT wallet_address FROM users WHERE id = $1", [userId])
    if (userResult.rows.length === 0) {
      return NextResponse.json({ 
        error: "User not found",
        details: "Invalid user ID" 
      }, { status: 404 })
    }

    const userWalletAddress = walletAddress || userResult.rows[0].wallet_address

    // Verify and sync subscription with blockchain
    const syncResult = await BillingService.verifyAndSyncSubscription(
      userId, 
      transactionHash, 
      userWalletAddress
    )

    if (!syncResult.success) {
      return NextResponse.json({ 
        error: "Subscription verification failed",
        details: syncResult.error?.message || "Unable to verify blockchain transaction",
        billingError: syncResult.error
      }, { status: 400 })
    }

    // Legacy upgrade call for backward compatibility
    const legacySuccess = await upgradeSubscription(userId, tier, transactionHash, amountPaid || "0")
    
    // If expiryDate is provided, update it directly
    if (expiryDate) {
      await query(
        `UPDATE users SET subscription_expiry = $1 WHERE id = $2`,
        [new Date(expiryDate), userId]
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: "Subscription upgraded successfully",
      subscriptionUpdated: syncResult.subscriptionUpdated,
      transactionHash,
      tier
    })

  } catch (error) {
    console.error("[v0] Subscription upgrade API error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 })
  }
}
