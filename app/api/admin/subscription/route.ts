import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { adminWallet, targetWallet, action, duration, days } = await request.json()

    // Verify admin
    const adminResult = await query("SELECT is_admin FROM users WHERE wallet_address = $1", [adminWallet])
    if (!adminResult.rows[0]?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get target user
    const userResult = await query("SELECT * FROM users WHERE wallet_address = $1", [targetWallet])
    if (!userResult.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userResult.rows[0]

    if (action === "grant") {
      // Grant subscription (monthly or yearly)
      const isYearly = duration === "yearly"
      const durationDays = isYearly ? 365 : 30
      const newExpiry = new Date()
      newExpiry.setDate(newExpiry.getDate() + durationDays)

      await query(
        "UPDATE users SET subscription_tier = 'pro', subscription_expiry = $1 WHERE wallet_address = $2",
        [newExpiry.toISOString(), targetWallet]
      )

      console.log(`Admin ${adminWallet} granted ${duration} subscription to ${targetWallet}`)
      
      return NextResponse.json({
        success: true,
        message: `Granted ${duration} Pro subscription to user`,
        newExpiry: newExpiry.toISOString()
      })
    }

    if (action === "extend") {
      // Extend subscription by specified days
      const currentExpiry = user.subscription_expiry ? new Date(user.subscription_expiry) : new Date()
      const extendedExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()))
      extendedExpiry.setDate(extendedExpiry.getDate() + parseInt(days))

      await query(
        "UPDATE users SET subscription_tier = 'pro', subscription_expiry = $1 WHERE wallet_address = $2",
        [extendedExpiry.toISOString(), targetWallet]
      )

      console.log(`Admin ${adminWallet} extended subscription for ${targetWallet} by ${days} days`)
      
      return NextResponse.json({
        success: true,
        message: `Extended subscription by ${days} days`,
        newExpiry: extendedExpiry.toISOString()
      })
    }

    if (action === "cancel") {
      // Cancel subscription
      await query(
        "UPDATE users SET subscription_tier = 'free', subscription_expiry = NULL WHERE wallet_address = $1",
        [targetWallet]
      )

      console.log(`Admin ${adminWallet} cancelled subscription for ${targetWallet}`)
      
      return NextResponse.json({
        success: true,
        message: "Subscription cancelled"
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Admin subscription error:", error)
    return NextResponse.json({ error: "Failed to manage subscription" }, { status: 500 })
  }
}