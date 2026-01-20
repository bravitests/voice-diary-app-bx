import { NextRequest, NextResponse } from "next/server"
import { updateUserProfile } from "@/lib/database"

export async function PUT(request: NextRequest) {
    try {
        const { userId, name, email, photoURL, fcmToken } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }

        console.log("[API] Updating user profile:", userId)

        const updatedUser = await updateUserProfile(userId, name, email, photoURL, fcmToken)

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json({
            user: {
                id: updatedUser.id,
                firebaseUid: updatedUser.firebase_uid,
                name: updatedUser.name,
                email: updatedUser.email,
                photoURL: updatedUser.photo_url,
                subscriptionTier: updatedUser.subscription_tier || 'free',
                subscriptionExpiry: updatedUser.subscription_expiry,
                isAdmin: updatedUser.is_admin || false
            }
        })
    } catch (error: any) {
        console.error("[API] Update user error:", error)
        return NextResponse.json({
            error: "Failed to update profile"
        }, { status: 500 })
    }
}
