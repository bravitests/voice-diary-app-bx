import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminWallet = searchParams.get("admin_wallet")

    // Verify admin access
    const admin = await db.getUserByWallet(adminWallet!)
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const result = await db.query(`
      SELECT 
        u.id,
        u.wallet_address,
        u.name,
        u.email,
        u.subscription_tier,
        u.subscription_expiry,
        u.created_at,
        COUNT(r.id) as recording_count,
        s.status as subscription_status,
        s.amount_paid as last_payment
      FROM users u
      LEFT JOIN recordings r ON r.user_id = u.id
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      GROUP BY u.id, s.status, s.amount_paid
      ORDER BY u.created_at DESC
      LIMIT 100
    `)

    return NextResponse.json({ users: result.rows })
  } catch (error) {
    console.error("Admin users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}