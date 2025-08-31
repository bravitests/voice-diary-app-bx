import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Check if user already exists
    let user = await db.getUserByWallet(walletAddress)
    
    if (!user) {
      // Create new user
      user = await db.createUser(walletAddress)
      console.log("[v0] Created new user:", user.id)

      // Create default "Personal Growth" purpose for new user
      await db.createDefaultPurpose(user.id)
    }

    return NextResponse.json({ 
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        name: user.name,
        email: user.email,
        subscriptionTier: user.subscription_tier || 'free',
        subscriptionExpiry: user.subscription_expiry,
        isAdmin: user.is_admin || false
      }
    })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}