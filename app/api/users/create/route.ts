import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

// Helper function to get user by Firebase UID
async function getUserByFirebaseUid(firebaseUid: string) {
  const userResult = await query("SELECT * FROM users WHERE firebase_uid = $1", [firebaseUid])
  return userResult.rows[0]
}

// Helper function to create a new Firebase user
async function createFirebaseUser(firebaseUid: string, email: string | null, name: string | null, photoURL: string | null) {
  const createResult = await query(
    "INSERT INTO users (firebase_uid, name, email, photo_url) VALUES ($1, $2, $3, $4) RETURNING *",
    [firebaseUid, name || null, email || null, photoURL || null]
  )
  return createResult.rows[0]
}

// Helper function to create a default purpose for a user
async function createDefaultPurpose(userId: string) {
  await query(`
    INSERT INTO purposes (user_id, name, description, is_default, color)
    VALUES ($1, $2, $3, $4, $5)
  `, [
    userId,
    'Personal Growth',
    'Daily reflections on personal development and self-improvement',
    true,
    '#cdb4db'
  ])
  console.log("[v0] Created default purpose for user:", userId)
}

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, name, email, photoURL } = await request.json()

    if (!firebaseUid) {
      return NextResponse.json({ error: "Firebase UID required" }, { status: 400 })
    }

    console.log("[v0] Authenticating user:", firebaseUid)

    // Check if user already exists
    let user = await getUserByFirebaseUid(firebaseUid)

    if (!user) {
      console.log("[v0] Creating new user for firebaseUid:", firebaseUid)
      // Create new user
      user = await createFirebaseUser(firebaseUid, email, name, photoURL)
      console.log("[v0] Created new user:", user.id)

      // Create default "Personal Growth" purpose for new user
      try {
        await createDefaultPurpose(user.id)
      } catch (purposeError) {
        console.warn("[v0] Failed to create default purpose:", purposeError)
      }
    } else {
      // Update existing user with latest info from Firebase
      console.log("[v0] Updating user profile:", user.id)
      // We can also update photoURL if it changed
      const updateResult = await query(
        "UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email), photo_url = COALESCE($4, photo_url) WHERE firebase_uid = $1 RETURNING *",
        [firebaseUid, name || null, email || null, photoURL || null]
      )
      user = updateResult.rows[0]
    }

    return NextResponse.json({
      user: {
        id: user.id,
        firebaseUid: user.firebase_uid,
        name: user.name,
        email: user.email,
        photoURL: user.photo_url,
        subscriptionTier: user.subscription_tier || 'free',
        subscriptionExpiry: user.subscription_expiry,
        isAdmin: user.is_admin || false
      }
    })
  } catch (error: any) {
    console.error("[v0] Create user error details:", {
      error: error.message,
      stack: error.stack,
      name: error.name
    })

    return NextResponse.json({
      error: process.env.NODE_ENV === 'development'
        ? `Database error: ${error.message}`
        : "Authentication service temporarily unavailable"
    }, { status: 500 })
  }
}