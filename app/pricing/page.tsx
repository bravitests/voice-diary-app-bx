"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Plan {
    id: string
    name: string
    price: number
    interval: string
    limits: {
        recording_limit_seconds: number
        entries_per_month: number
        chats_per_day: number
    }
}

export default function PricingPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            const response = await fetch("/api/subscription/plans")
            if (response.ok) {
                const data = await response.json()
                setPlans(data)
            }
        } catch (error) {
            console.error("Failed to fetch plans", error)
            toast.error("Failed to load subscription plans")
        } finally {
            setLoading(false)
        }
    }

    const handleSubscribe = async (plan: Plan) => {
        if (!user) {
            toast.error("Please sign in to subscribe")
            router.push("/")
            return
        }

        setProcessingId(plan.id)

        try {
            const response = await fetch("/api/subscription/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firebaseUid: user.firebaseUid,
                    planId: plan.id,
                    callbackUrl: `${window.location.origin}/dashboard`,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to initialize payment")
            }

            if (data.authorizationUrl) {
                // Redirect to Paystack
                window.location.href = data.authorizationUrl
            } else {
                toast.success(data.message || "Plan activated")
                router.push("/dashboard")
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setProcessingId(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-16 px-4">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
                <p className="text-muted-foreground text-lg">Choose the plan that fits your journaling needs.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((plan) => (
                    <Card key={plan.id} className={`flex flex-col ${plan.name === "Pro" ? "border-primary shadow-lg relative" : ""}`}>
                        {plan.name === "Pro" && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                                Most Popular
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>
                                <span className="text-3xl font-bold text-foreground">
                                    {plan.price === 0 ? "Free" : `KSH ${plan.price}`}
                                </span>
                                {plan.price > 0 && <span className="text-muted-foreground">/{plan.interval}</span>}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span>{Math.floor(plan.limits.recording_limit_seconds / 60)} mins recording time</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span>{plan.limits.entries_per_month} entries per month</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span>{plan.limits.chats_per_day} AI chats per day</span>
                                </li>
                                {plan.name === "Pro" && (
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        <span>Advanced AI Insights</span>
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                variant={plan.name === "Pro" ? "default" : "outline"}
                                onClick={() => handleSubscribe(plan)}
                                disabled={!!processingId}
                            >
                                {processingId === plan.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : null}
                                {plan.price === 0 ? "Get Started" : "Subscribe"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
