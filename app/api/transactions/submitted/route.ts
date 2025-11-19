import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId, transactionHash } = await request.json()

    if (!userId || !transactionHash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create or update payment tracking record with pending status
    await query(
      `INSERT INTO payment_tracking (user_id, transaction_hash, status, amount_eth) 
       VALUES ($1, $2, 'pending', 0.01)
       ON CONFLICT (transaction_hash) 
       DO UPDATE SET status = 'pending'`,
      [userId, transactionHash]
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Transaction submission error:", error)
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 })
  }
}