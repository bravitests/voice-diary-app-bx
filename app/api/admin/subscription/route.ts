import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { adminUid, targetUid, action, months } = await request.json()

    // Verify admin
    const adminResult = await query("SELECT is_admin FROM users WHERE firebase_uid = $1", [adminUid])
    // Added safety check: ensure rows exist before accessing index 0
    if (!adminResult.rows.length || !adminResult.rows[0]?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get target user
    const userResult = await query("SELECT * FROM users WHERE firebase_uid = $1", [targetUid])
    if (!userResult.rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userResult.rows[0]

    // ACTION: Grant Pro (Start from today)
    if (action === "grantPro") {
      const monthsToAdd = parseInt(months) || 1
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd)

      console.log(`Admin ${adminUid} granting ${monthsToAdd} months of Pro to ${targetUid}`)
      
      await query(
        "UPDATE users SET subscription_tier = 'pro', subscription_expiry = $1 WHERE firebase_uid = $2",
        [expiryDate, targetUid]
      )
      
      return NextResponse.json({
        success: true,
        message: `Pro subscription granted for ${monthsToAdd} month(s)`,
        expiryDate
      })
    }

    // ACTION: Extend Pro (Add to existing date)
    if (action === "extendPro") {
      const monthsToAdd = parseInt(months) || 1
      
      // If user has an expiry date in the future, add to it. 
      // If they are expired or null, start from now.
      const currentExpiry = user.subscription_expiry ? new Date(user.subscription_expiry) : new Date()
      const now = new Date()
      
      // Determine the base date: if current expiry is in the past, use 'now'
      const baseDate = currentExpiry > now ? currentExpiry : now
      
      const newExpiry = new Date(baseDate)
      newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd)

      await query(
        "UPDATE users SET subscription_tier = 'pro', subscription_expiry = $1 WHERE firebase_uid = $2",
        [newExpiry, targetUid]
      )

      return NextResponse.json({
        success: true,
        message: `Pro subscription extended by ${monthsToAdd} month(s)`,
        previousExpiry: currentExpiry,
        newExpiry
      })
    }

    // ACTION: Cancel/Revoke Pro
    if (action === "cancelPro") {
      await query(
        "UPDATE users SET subscription_tier = 'free', subscription_expiry = NULL WHERE firebase_uid = $1",
        [targetUid]
      )
      
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