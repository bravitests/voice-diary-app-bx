import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, name, email } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 })
    }

    console.log("[v0] Authenticating user:", walletAddress)

    // Check if user already exists (case-insensitive)
    let userResult = await query("SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)", [walletAddress])
    let user = userResult.rows[0]
    
    if (!user) {
      console.log("[v0] Creating new user for wallet:", walletAddress)
      // Create new user with name and email if provided
      const createResult = await query(
        "INSERT INTO users (wallet_address, name, email) VALUES ($1, $2, $3) RETURNING *", 
        [walletAddress.toLowerCase(), name || null, email || null]
      )
      user = createResult.rows[0]
      console.log("[v0] Created new user:", user.id)
    } else if (name || email) {
      // Update existing user with name/email if provided
      console.log("[v0] Updating user profile:", user.id)
      const updateResult = await query(
        "UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email) WHERE LOWER(wallet_address) = LOWER($1) RETURNING *",
        [walletAddress, name || null, email || null]
      )
      user = updateResult.rows[0]

      // Create default "Personal Growth" purpose for new user
      try {
        // Check if user already has any purposes
        const existingPurposes = await query("SELECT COUNT(*) as count FROM purposes WHERE user_id = $1", [user.id])
        
        if (existingPurposes.rows[0].count === 0) {
          await query(`
            INSERT INTO purposes (user_id, name, description, is_default, color)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            user.id, 
            'Personal Growth', 
            'Daily reflections on personal development and self-improvement',
            true,
            '#cdb4db'
          ])
          console.log("[v0] Created default purpose for user:", user.id)
        }
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