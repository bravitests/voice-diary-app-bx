import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { decodeEventLog } from "viem"
import { query } from "@/lib/database"

const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "tier",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expiryTimestamp",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionPurchased",
    "type": "event"
  }
] as const

export async function POST(request: NextRequest) {
  try {
    // Get secrets
    const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY
    if (!signingKey) {
      return NextResponse.json({ error: "Webhook signing key not configured" }, { status: 500 })
    }

    // Verify webhook signature
    const signature = request.headers.get('x-alchemy-signature')
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    const body = await request.text()
    const computedSignature = createHmac('sha256', signingKey).update(body).digest('hex')
    
    if (signature !== computedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse event data
    const event = JSON.parse(body)
    const log = event.data.activity[0].log

    // Decode event log
    const decodedLog = decodeEventLog({
      abi: CONTRACT_ABI,
      topics: log.topics,
      data: log.data
    })

    const { user, expiryTimestamp } = decodedLog.args
    const walletAddress = user.toLowerCase()
    const expiryDate = new Date(Number(expiryTimestamp) * 1000)

    // Extract the transaction hash from the payload
    const transactionHash = event.data.activity[0].transaction.hash

    // Update database
    await query('BEGIN')
    
    await query(
      `UPDATE users SET subscription_tier = 'pro', subscription_expiry = $1 
       WHERE wallet_address = $2`,
      [expiryDate, walletAddress]
    )
    
    await query(
      `UPDATE payment_tracking SET status = 'confirmed', confirmed_at = NOW() 
       WHERE transaction_hash = $1`,
      [transactionHash]
    )
    
    await query('COMMIT')

    return NextResponse.json({ success: true })

  } catch (error) {
    await query('ROLLBACK')
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}