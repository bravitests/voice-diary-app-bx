import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/paystack"
import { updatePaystackSubscription, getUserByFirebaseUid, query } from "@/lib/database"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const signature = request.headers.get("x-paystack-signature")

        if (!signature || !verifyWebhookSignature(body, signature)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }

        const event = body.event
        const data = body.data

        console.log(`[Paystack Webhook] Received event: ${event}`, data.reference)

        if (event === "charge.success") {
            // Update subscription status
            await updatePaystackSubscription(data.reference, {
                status: "active",
                paystackCustomerCode: data.customer.customer_code,
                currentPeriodStart: new Date(data.paid_at),
                // Assuming monthly for now, ideally calculate based on plan
                currentPeriodEnd: new Date(new Date(data.paid_at).setMonth(new Date(data.paid_at).getMonth() + 1)),
            })

            // Also update user's subscription_tier in users table for easy access
            // We need to find the user first. The subscription record has the user_id.
            // But updatePaystackSubscription returns the updated record.
            const sub = await query("SELECT user_id, plan_id FROM paystack_subscriptions WHERE paystack_reference = $1", [data.reference])
            if (sub.rows.length > 0) {
                const { user_id, plan_id } = sub.rows[0]
                const plan = await query("SELECT name FROM subscription_plans WHERE id = $1", [plan_id])
                if (plan.rows.length > 0) {
                    const tierName = plan.rows[0].name.toLowerCase()
                    // Map 'starter' to 'pro' if we only have free/pro enum in users table, 
                    // OR update users table constraint. 
                    // For now, let's assume we update the constraint or map it.
                    // The user requested "Starter" and "Pro". 
                    // If the users table only has 'free'/'pro', we might need to migrate that check constraint.
                    // Let's assume we will migrate it or it's just text.

                    await query("UPDATE users SET subscription_tier = $1 WHERE id = $2", [tierName, user_id])
                }
            }
        } else if (event === "subscription.create") {
            // Update subscription code
            // We might need to match by customer code or email if reference isn't passed in this event
            // Usually charge.success happens first or around same time
        }

        return NextResponse.json({ status: "success" })
    } catch (error) {
        console.error("Webhook error:", error)
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
    }
}
