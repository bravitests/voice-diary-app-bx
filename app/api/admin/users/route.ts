import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminWallet = searchParams.get('adminWallet')

    // Verify admin
    const adminResult = await query("SELECT is_admin FROM users WHERE wallet_address = $1", [adminWallet])
    if (!adminResult.rows[0]?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get all users with stats
    const usersResult = await query(`
      SELECT 
        u.id,
        u.wallet_address,
        u.name,
        u.email,
        u.subscription_tier,
        u.subscription_expiry,
        u.is_admin,
        u.created_at,
        COUNT(r.id) as recording_count
      FROM users u
      LEFT JOIN recordings r ON u.id = r.user_id
      GROUP BY u.id, u.wallet_address, u.name, u.email, u.subscription_tier, u.subscription_expiry, u.is_admin, u.created_at
      ORDER BY u.created_at DESC
    `)

    const users = usersResult.rows.map(user => ({
      id: user.id,
      walletAddress: user.wallet_address,
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscription_tier,
      subscriptionExpiry: user.subscription_expiry,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
      recordingCount: parseInt(user.recording_count)
    }))

    // Get summary stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_tier = 'pro' THEN 1 END) as pro_users,
        COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
      FROM users
    `)

    const stats = {
      totalUsers: parseInt(statsResult.rows[0].total_users),
      proUsers: parseInt(statsResult.rows[0].pro_users),
      adminUsers: parseInt(statsResult.rows[0].admin_users)
    }

    return NextResponse.json({ users, stats })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { adminWallet, targetWallet, action } = await request.json()

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

    if (action === "makeAdmin") {
      await query("UPDATE users SET is_admin = true WHERE wallet_address = $1", [targetWallet])
      console.log(`Admin ${adminWallet} made ${targetWallet} an admin`)
      
      return NextResponse.json({
        success: true,
        message: "User granted admin privileges"
      })
    }

    if (action === "removeAdmin") {
      // Prevent removing the last admin
      const adminCountResult = await query("SELECT COUNT(*) as count FROM users WHERE is_admin = true")
      if (parseInt(adminCountResult.rows[0].count) <= 1) {
        return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 })
      }

      await query("UPDATE users SET is_admin = false WHERE wallet_address = $1", [targetWallet])
      console.log(`Admin ${adminWallet} removed admin privileges from ${targetWallet}`)
      
      return NextResponse.json({
        success: true,
        message: "Admin privileges removed"
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Admin users error:", error)
    return NextResponse.json({ error: "Failed to manage user" }, { status: 500 })
  }
}