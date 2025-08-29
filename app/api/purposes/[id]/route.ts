import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet_address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Check if purpose exists and belongs to user
    const purposeResult = await query(
      `
      SELECT p.id, p.name, p.is_default, COUNT(r.id) as recording_count
      FROM purposes p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN recordings r ON r.purpose_id = p.id
      WHERE p.id = $1 AND u.wallet_address = $2
      GROUP BY p.id, p.name, p.is_default
    `,
      [params.id, walletAddress],
    )

    if (purposeResult.rows.length === 0) {
      return NextResponse.json({ error: "Purpose not found" }, { status: 404 })
    }

    const purpose = purposeResult.rows[0]

    // Prevent deletion of default purpose
    if (purpose.is_default) {
      return NextResponse.json({ error: "Cannot delete default purpose" }, { status: 400 })
    }

    // Delete the purpose (recordings will have purpose_id set to NULL due to ON DELETE SET NULL)
    await query("DELETE FROM purposes WHERE id = $1", [params.id])

    return NextResponse.json({
      message: "Purpose deleted successfully",
      recordingsAffected: Number.parseInt(purpose.recording_count),
    })
  } catch (error) {
    console.error("Error deleting purpose:", error)
    return NextResponse.json({ error: "Failed to delete purpose" }, { status: 500 })
  }
}
