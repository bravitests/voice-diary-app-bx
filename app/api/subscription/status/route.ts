import { type NextRequest, NextResponse } from "next/server"
import { BillingService } from "@/lib/billing-service"
import { getUserSubscriptionStatus } from "@/lib/subscription"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const walletAddress = searchParams.get("walletAddress")
    const checkSync = searchParams.get("checkSync") === "true"

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    // Get database subscription status
    const dbStatus = await getUserSubscriptionStatus(userId)

    let response: any = {
      database: dbStatus,
      timestamp: new Date().toISOString()
    }

    // If wallet address provided and sync check requested, compare with contract
    if (walletAddress && checkSync) {
      try {
        const syncCheck = await BillingService.checkSubscriptionSync(userId, walletAddress)
        response.sync = syncCheck
        
        if (!syncCheck.inSync) {
          response.warning = "Subscription status is out of sync between database and smart contract"
        }
      } catch (error) {
        response.syncError = "Unable to check contract status"
      }
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

export async function POST(request: NextRequest) {
  try {
    const { userId, walletAddress, action } = await request.json()

    if (!userId || !walletAddress) {
      return NextResponse.json({ 
        error: "Missing required fields",
        details: "userId and walletAddress are required"
      }, { status: 400 })
    }

    if (action === "sync") {
      // Force sync subscription status
      const syncCheck = await BillingService.checkSubscriptionSync(userId, walletAddress)
      
      return NextResponse.json({
        success: true,
        sync: syncCheck,
        message: syncCheck.inSync ? "Subscription is in sync" : "Sync discrepancy detected"
      })
    }

    return NextResponse.json({ 
      error: "Invalid action",
      details: "Supported actions: sync"
    }, { status: 400 })

  } catch (error) {
    console.error("Subscription status action error:", error)
    return NextResponse.json({ 
      error: "Failed to process subscription action",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}