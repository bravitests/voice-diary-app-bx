import { type NextRequest, NextResponse } from "next/server"
import { unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || !url.startsWith("/uploads/audio/")) {
      return NextResponse.json({ error: "Invalid audio URL" }, { status: 400 })
    }

    // Extract filename from URL
    const filename = url.replace("/uploads/audio/", "")
    const filepath = join(process.cwd(), "public", "uploads", "audio", filename)

    // Delete file if it exists
    if (existsSync(filepath)) {
      await unlink(filepath)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting audio file:", error)
    return NextResponse.json({ error: "Failed to delete audio file" }, { status: 500 })
  }
}
