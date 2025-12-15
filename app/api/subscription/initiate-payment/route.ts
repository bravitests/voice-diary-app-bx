import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    console.log('[PAYMENT INIT] Request:', { userId })

    if (!userId) {
      console.log('[PAYMENT INIT] Missing required fields')
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get current Pro price from database
    const pricingResult = await query("SELECT monthly_usd FROM pricing WHERE id = 1")
    console.log('[PAYMENT INIT] Pricing query result:', pricingResult.rows)

    if (pricingResult.rows.length === 0) {
      console.log('[PAYMENT INIT] No pricing configured')
      return NextResponse.json({ error: "Pricing not configured" }, { status: 500 })
    }

    const usdPrice = pricingResult.rows[0].monthly_usd
    console.log('[PAYMENT INIT] USD Price:', usdPrice)

    // Get real ETH price from CoinGecko API with fallback
    let ethUsdRate = 4384.95 // Fallback rate
    try {
      const ethPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      if (ethPriceResponse.ok) {
        const ethPriceData = await ethPriceResponse.json()
        if (ethPriceData.ethereum?.usd) {
          ethUsdRate = ethPriceData.ethereum.usd
        }
      }
    } catch (apiError) {
      console.warn('CoinGecko API failed, using fallback rate:', apiError)
    }

    const ethPrice = (parseFloat(usdPrice) / ethUsdRate).toFixed(6)
    console.log('[PAYMENT INIT] ETH Rate:', ethUsdRate, 'ETH Price:', ethPrice)

    // Create payment tracking record
    // Note: wallet_address is now optional or we pass a placeholder if schema not updated yet
    // We will update schema to make it nullable, but for now passing 'N/A' if needed or just null if schema allows
    // Assuming schema update runs separately or we handle it here.
    // Let's try to insert without it if we update schema, or pass null.
    const trackingResult = await query(
      `INSERT INTO payment_tracking (user_id, amount_eth) 
       VALUES ($1, $2) RETURNING id`,
      [userId, ethPrice]
    )

    console.log('[PAYMENT INIT] Payment tracking created:', trackingResult.rows[0].id)

    return NextResponse.json({
      success: true,
      paymentId: trackingResult.rows[0].id,
      amountEth: ethPrice,
      amountUsd: usdPrice
    })

  } catch (error) {
    console.error('[PAYMENT INIT] Error:', error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}