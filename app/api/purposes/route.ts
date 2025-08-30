import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet_address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    const user = await db.getUserByWallet(walletAddress)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const result = await db.query(`
      SELECT p.*, COUNT(r.id) as recording_count
      FROM purposes p
      LEFT JOIN recordings r ON r.purpose_id = p.id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.is_default DESC, p.created_at ASC
    `, [user.id])

    return NextResponse.json({ purposes: result.rows })
  } catch (error) {
    console.error("Get purposes error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, name, description } = await request.json()

    if (!walletAddress || !name) {
      return NextResponse.json({ error: "Wallet address and name required" }, { status: 400 })
    }

    const user = await db.getUserByWallet(walletAddress)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const result = await db.query(`
      INSERT INTO purposes (user_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [user.id, name, description || null])

    return NextResponse.json({ purpose: result.rows[0] })
  } catch (error) {
    console.error("Create purpose error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}