import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet_address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Get user's purposes
    const result = await query(
      `
      SELECT p.id, p.name, p.description, p.color, p.is_default, p.created_at,
             COUNT(r.id) as recording_count
      FROM purposes p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN recordings r ON r.purpose_id = p.id
      WHERE u.wallet_address = $1
      GROUP BY p.id, p.name, p.description, p.color, p.is_default, p.created_at
      ORDER BY p.is_default DESC, p.created_at ASC
    `,
      [walletAddress],
    )

    return NextResponse.json({ purposes: result.rows })
  } catch (error) {
    console.error("Error fetching purposes:", error)
    return NextResponse.json({ error: "Failed to fetch purposes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, name, description, color } = await request.json()

    if (!walletAddress || !name) {
      return NextResponse.json({ error: "Wallet address and name required" }, { status: 400 })
    }

    // Get user ID
    const userResult = await query("SELECT id FROM users WHERE wallet_address = $1", [walletAddress])
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userId = userResult.rows[0].id

    // Create new purpose
    const result = await query(
      `
      INSERT INTO purposes (user_id, name, description, color)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, color, is_default, created_at
    `,
      [userId, name, description || null, color || "#cdb4db"],
    )

    return NextResponse.json({ purpose: result.rows[0] })
  } catch (error) {
    console.error("Error creating purpose:", error)
    if (error.code === "23505") {
      // Unique constraint violation
      return NextResponse.json({ error: "Purpose name already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create purpose" }, { status: 500 })
  }
}
