import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId, transactionHash, walletAddress } = await request.json()

    if (!userId || !transactionHash || !walletAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create or update payment tracking record with pending status
    await query(
      `INSERT INTO payment_tracking (user_id, wallet_address, transaction_hash, status, amount_eth) 
       VALUES ($1, $2, $3, 'pending', 0.01)
       ON CONFLICT (transaction_hash) 
       DO UPDATE SET status = 'pending', wallet_address = $2`,
      [userId, walletAddress, transactionHash]
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Transaction submission error:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}