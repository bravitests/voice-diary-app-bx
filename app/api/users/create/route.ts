import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 })
    }

    console.log("[v0] Authenticating user:", walletAddress)

    // Check if user already exists
    let user = await db.getUserByWallet(walletAddress)
    
    if (!user) {
      console.log("[v0] Creating new user for wallet:", walletAddress)
      // Create new user
      user = await db.createUser(walletAddress)
      console.log("[v0] Created new user:", user.id)

      // Create default "Personal Growth" purpose for new user
      try {
        await db.createDefaultPurpose(user.id)
        console.log("[v0] Created default purpose for user:", user.id)
      } catch (purposeError) {
        console.warn("[v0] Failed to create default purpose:", purposeError)
        // Don't fail the whole request if purpose creation fails
      }
    } else {
      console.log("[v0] Found existing user:", user.id)
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
    console.error("[v0] Create user error details:", {
      error: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // Return more specific error messages
    if (error.message?.includes('connect')) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 503 })
    }
    
    if (error.message?.includes('timeout')) {
      return NextResponse.json({ error: "Database timeout" }, { status: 504 })
    }
    
    return NextResponse.json({ 
      error: process.env.NODE_ENV === 'development' 
        ? `Database error: ${error.message}` 
        : "Authentication service temporarily unavailable" 
    }, { status: 500 })
  }
}