import { NextResponse } from "next/server"
import { query } from "@/lib/database"
import { firebaseAdmin } from "@/lib/firebase-admin"

export async function GET(request: Request) {
    try {
        // Authenticate the cron job (optional but recommended)
        const { searchParams } = new URL(request.url)
        const key = searchParams.get('key')
        if (key !== process.env.CRON_SECRET) {
            // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            // For now, open for testing
        }

        console.log("[CRON] Starting daily reminders check...")

        // 1. Find users who have an FCM token but NO recordings today
        const targetUsersResult = await query(`
            SELECT u.id, u.fcm_token 
            FROM users u
            WHERE u.fcm_token IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM recordings r 
                WHERE r.user_id = u.id 
                AND r.created_at > (NOW() - INTERVAL '24 hours')
            )
        `)

        const usersToNotify = targetUsersResult.rows
        console.log(`[CRON] Found ${usersToNotify.length} users to notify`)

        if (usersToNotify.length === 0) {
            return NextResponse.json({ message: "No users to notify" })
        }

        // 2. Send notifications
        const tokens = usersToNotify.map(u => u.fcm_token)

        // Firebase Cloud Messaging Multicast
        const message = {
            notification: {
                title: 'How was your day?',
                body: 'Take a moment to record your thoughts in VoiceDiary.',
            },
            tokens: tokens,
        }

        const response = await firebaseAdmin.messaging().sendMulticast(message)
        console.log(`[CRON] Notifications sent. Success: ${response.successCount}, Failure: ${response.failureCount}`)

        if (response.failureCount > 0) {
            const failedTokens = []
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx])
                }
            })
            console.log('Failed tokens:', failedTokens)
        }

        return NextResponse.json({
            success: true,
            sent: response.successCount,
            failed: response.failureCount
        })

    } catch (error: any) {
        console.error("[CRON] Error sending reminders:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
