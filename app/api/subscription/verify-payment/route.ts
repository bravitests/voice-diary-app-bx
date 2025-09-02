import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`

export async function POST(request: NextRequest) {
  try {
    const { userId, transactionHash, action } = await request.json()

    if (!userId || !transactionHash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Handle transaction hash update
    if (action === 'update_hash') {
      await query(
        "UPDATE payment_tracking SET transaction_hash = $1 WHERE user_id = $2 AND transaction_hash IS NULL",
        [transactionHash, userId]
      )
      return NextResponse.json({ success: true, message: "Transaction hash updated" })
    }

    // Get payment tracking record
    const trackingResult = await query(
      "SELECT * FROM payment_tracking WHERE user_id = $1 AND transaction_hash = $2",
      [userId, transactionHash]
    )

    if (trackingResult.rows.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const payment = trackingResult.rows[0]

    if (payment.status === 'confirmed') {
      return NextResponse.json({ 
        success: true, 
        status: 'confirmed',
        message: "Payment already confirmed" 
      })
    }

    if (payment.status === 'failed' || payment.verification_attempts >= 4) {
      return NextResponse.json({ 
        success: false, 
        status: 'failed',
        message: "Payment verification failed" 
      })
    }

    // Verify transaction on blockchain
    const client = createPublicClient({
      chain: base,
      transport: http()
    })

    try {
      const receipt = await client.getTransactionReceipt({ 
        hash: transactionHash as `0x${string}` 
      })

      if (receipt.status === 'success' && receipt.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
        // Payment confirmed - update user subscription
        await query("BEGIN")
        
        // Update payment tracking
        await query(
          "UPDATE payment_tracking SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1",
          [payment.id]
        )

        // Update user subscription
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 30) // 30 days from now

        await query(
          "UPDATE users SET subscription_tier = 'pro', subscription_expiry = $1 WHERE id = $2",
          [expiryDate, userId]
        )

        await query("COMMIT")

        return NextResponse.json({ 
          success: true, 
          status: 'confirmed',
          expiryDate: expiryDate.toISOString()
        })
      } else {
        // Transaction failed
        await query(
          "UPDATE payment_tracking SET status = 'failed' WHERE id = $1",
          [payment.id]
        )
        return NextResponse.json({ 
          success: false, 
          status: 'failed',
          message: "Transaction failed on blockchain" 
        })
      }
    } catch (blockchainError) {
      // Increment verification attempts
      await query(
        "UPDATE payment_tracking SET verification_attempts = verification_attempts + 1 WHERE id = $1",
        [payment.id]
      )

      return NextResponse.json({ 
        success: false, 
        status: 'pending',
        message: "Blockchain verification pending",
        attempts: payment.verification_attempts + 1
      })
    }

  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}