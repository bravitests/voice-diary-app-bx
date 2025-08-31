import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet_address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    let user = await db.getUserByWallet(walletAddress)
    
    // If user doesn't exist, create them
    if (!user) {
      user = await db.createUser(walletAddress)
      console.log("[v0] Created new user:", user.id)
    }

    // Get user's purposes
    let purposes = await db.getUserPurposes(user.id)

    // If user has no purposes, create default one (this handles both new and existing users)
    if (purposes.length === 0) {
      const defaultPurpose = await db.createDefaultPurpose(user.id)
      if (defaultPurpose) {
        purposes = await db.getUserPurposes(user.id) // Fetch again after creating
      }
    }

    return NextResponse.json({ purposes })
  } catch (error) {
    console.error("Get purposes error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, name, description, color } = await request.json()

    if (!walletAddress || !name) {
      return NextResponse.json({ error: "Wallet address and name required" }, { status: 400 })
    }

    let user = await db.getUserByWallet(walletAddress)
    
    // Create user if they don't exist
    if (!user) {
      user = await db.createUser(walletAddress)
    }

    const purpose = await db.createPurpose(user.id, name, description, false, color || '#cdb4db')

    return NextResponse.json({ purpose })
  } catch (error) {
    console.error("Create purpose error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}