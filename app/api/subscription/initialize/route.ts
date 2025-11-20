import { NextRequest, NextResponse } from "next/server"
import { initializeTransaction } from "@/lib/paystack"
import { getUserByFirebaseUid, getSubscriptionPlan, createPaystackSubscription } from "@/lib/database"

export async function POST(request: NextRequest) {
    try {
        const { firebaseUid, planId, callbackUrl } = await request.json()

        if (!firebaseUid || !planId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const user = await getUserByFirebaseUid(firebaseUid)
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const plan = await getSubscriptionPlan(planId)
        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 })
        }

        if (plan.price === 0) {
            // Handle free plan "subscription" (just update DB, no payment)
            // For now, we might not even need to "subscribe" to free plan if it's default
            return NextResponse.json({ message: "Free plan activated" })
        }

        // Initialize Paystack transaction
        const transaction = await initializeTransaction(
            user.email || `user-${user.id}@voicediary.xyz`, // Fallback email
            plan.price,
            plan.paystack_plan_code, // If we have a plan code, it's a subscription
            callbackUrl
        )

        // Create pending subscription record
        await createPaystackSubscription({
            userId: user.id,
            planId: plan.id,
            paystackReference: transaction.reference,
            status: "pending",
        })

        return NextResponse.json({ authorizationUrl: transaction.authorization_url, reference: transaction.reference })
    } catch (error: any) {
        console.error("Payment initialization error:", error)
        return NextResponse.json({ error: error.message || "Failed to initialize payment" }, { status: 500 })
    }
}
