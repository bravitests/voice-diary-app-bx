import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId, walletAddress } = await request.json()

    if (!userId || !walletAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get current Pro price from database
    const pricingResult = await query("SELECT monthly_usd FROM pricing WHERE id = 1")
    if (pricingResult.rows.length === 0) {
      return NextResponse.json({ error: "Pricing not configured" }, { status: 500 })
    }

    const usdPrice = pricingResult.rows[0].monthly_usd
    
    // Get real ETH price from CoinGecko API
    const ethPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    const ethPriceData = await ethPriceResponse.json()
    const ethUsdRate = ethPriceData.ethereum.usd
    
    const ethPrice = (parseFloat(usdPrice) / ethUsdRate).toFixed(6)

    // Create payment tracking record
    const trackingResult = await query(
      `INSERT INTO payment_tracking (user_id, wallet_address, amount_eth) 
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, walletAddress, ethPrice]
    )

    return NextResponse.json({
      success: true,
      paymentId: trackingResult.rows[0].id,
      amountEth: ethPrice,
      amountUsd: usdPrice
    })

  } catch (error) {
    console.error("Payment initiation error:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}