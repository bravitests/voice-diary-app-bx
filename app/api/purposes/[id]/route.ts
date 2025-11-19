import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const firebaseUid = searchParams.get("firebaseUid")

    if (!firebaseUid) {
      return NextResponse.json({ error: "Firebase UID required" }, { status: 400 })
    }

    const user = await db.getUserByWallet(firebaseUid)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if purpose exists and belongs to user
    const purposeResult = await db.query(`
      SELECT * FROM purposes WHERE id = $1 AND user_id = $2
    `, [params.id, user.id])

    if (purposeResult.rows.length === 0) {
      return NextResponse.json({ error: "Purpose not found" }, { status: 404 })
    }

    const purpose = purposeResult.rows[0]
    if (purpose.is_default) {
      return NextResponse.json({ error: "Cannot delete default purpose" }, { status: 400 })
    }

    // Delete the purpose
    await db.query(`DELETE FROM purposes WHERE id = $1`, [params.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete purpose error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}