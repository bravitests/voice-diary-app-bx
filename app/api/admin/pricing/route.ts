import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

const EXCHANGE_RATES = {
  ETH_TO_USD: 3500, // 1 ETH = $3500 USD
  USD_TO_KSH: 130,  // 1 USD = 130 KSH
}

export async function GET(request: NextRequest) {
  try {
    // Get current pricing from database or use defaults
    const pricingResult = await query("SELECT * FROM pricing WHERE id = 1")
    let currentPriceUSD = 2
    
    if (pricingResult.rows.length > 0) {
      currentPriceUSD = pricingResult.rows[0].monthly_usd
    } else {
      // Create default pricing record
      await query("INSERT INTO pricing (id, monthly_usd) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [currentPriceUSD])
    }
    
    const currentPriceETH = currentPriceUSD / EXCHANGE_RATES.ETH_TO_USD
    const currentPriceKSH = currentPriceUSD * EXCHANGE_RATES.USD_TO_KSH

    return NextResponse.json({
      pricing: {
        monthly: {
          eth: currentPriceETH,
          usd: currentPriceUSD,
          ksh: currentPriceKSH
        },
        yearly: {
          eth: currentPriceETH * 10,
          usd: currentPriceUSD * 10,
          ksh: currentPriceKSH * 10
        }
      },
      exchangeRates: EXCHANGE_RATES
    })
  } catch (error) {
    console.error("Get pricing error:", error)
    return NextResponse.json({ error: "Failed to get pricing" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, newPriceUSD, action } = await request.json()

    // Verify admin
    const userResult = await query("SELECT is_admin FROM users WHERE wallet_address = $1", [walletAddress])
    if (!userResult.rows[0]?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (action === "updatePrice") {
      // Update pricing in database
      await query("INSERT INTO pricing (id, monthly_usd) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET monthly_usd = $1", [newPriceUSD])
      
      const newPriceETH = newPriceUSD / EXCHANGE_RATES.ETH_TO_USD
      
      console.log(`Admin ${walletAddress} updated price to $${newPriceUSD} (${newPriceETH} ETH)`)
      
      return NextResponse.json({
        success: true,
        newPricing: {
          monthly: {
            eth: newPriceETH,
            usd: newPriceUSD,
            ksh: newPriceUSD * EXCHANGE_RATES.USD_TO_KSH
          },
          yearly: {
            eth: newPriceETH * 10,
            usd: newPriceUSD * 10,
            ksh: newPriceUSD * 10 * EXCHANGE_RATES.USD_TO_KSH
          }
        }
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Update pricing error:", error)
    return NextResponse.json({ error: "Failed to update pricing" }, { status: 500 })
  }
}