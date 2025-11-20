import { createHash } from "crypto"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_BASE_URL = "https://api.paystack.co"

if (!PAYSTACK_SECRET_KEY) {
    console.warn("PAYSTACK_SECRET_KEY is not set")
}

export async function initializeTransaction(email: string, amount: number, plan?: string, callbackUrl?: string) {
    const params: any = {
        email,
        amount: amount * 100, // Paystack expects amount in kobo/cents
        callback_url: callbackUrl,
    }

    if (plan) {
        params.plan = plan
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
    })

    const data = await response.json()
    if (!data.status) {
        throw new Error(data.message || "Failed to initialize transaction")
    }

    return data.data
}

export async function verifyTransaction(reference: string) {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
    })

    const data = await response.json()
    if (!data.status) {
        throw new Error(data.message || "Failed to verify transaction")
    }

    return data.data
}

export function verifyWebhookSignature(body: any, signature: string): boolean {
    const hash = createHash("sha512")
        .update(JSON.stringify(body))
        .digest("hex")
    return hash === signature
}

export async function createPaystackPlan(name: string, amount: number, interval: "monthly" | "yearly" = "monthly") {
    const response = await fetch(`${PAYSTACK_BASE_URL}/plan`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name,
            amount: amount * 100,
            interval,
        }),
    })

    const data = await response.json()
    if (!data.status) {
        throw new Error(data.message || "Failed to create plan")
    }

    return data.data
}
