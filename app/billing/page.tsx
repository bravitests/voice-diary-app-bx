"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  ArrowLeft,
  CreditCard,
  Check,
  Crown,
  Zap,
  Calendar,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import Link from "next/link"

export default function BillingPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<any[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    } finally {
      setLoadingPlans(false)
    }
  }

  if (isLoading || loadingPlans) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const currentTier = user.subscriptionTier || 'free'
  const isPro = currentTier === 'pro'
  const isStarter = currentTier === 'starter'
  const isFree = currentTier === 'free'

  // Helper to get plan badge color
  const getPlanColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'pro': return 'bg-purple-500 hover:bg-purple-600'
      case 'starter': return 'bg-blue-500 hover:bg-blue-600'
      default: return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/profile")} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Billing & Subscription</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 pb-20">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Current Subscription Status */}
          <Card className="border-primary/20 overflow-hidden">
            <div className={`h-2 w-full ${getPlanColor(currentTier)}`} />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Current Plan
                  </CardTitle>
                  <CardDescription>Your active subscription details</CardDescription>
                </div>
                <Badge className={getPlanColor(currentTier)}>
                  {currentTier.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Active</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Billing Cycle</p>
                  <p className="font-medium">Monthly</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {user.subscriptionExpiry
                        ? new Date(user.subscriptionExpiry).toLocaleDateString()
                        : "Never (Free Tier)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage Stats (Mocked for now based on tier limits) */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold">Plan Limits</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Recording Time</span>
                      <span className="font-medium">
                        {isPro ? '10 mins' : isStarter ? '5 mins' : '2 mins'}
                      </span>
                    </div>
                    <Progress value={isPro ? 100 : isStarter ? 50 : 20} className="h-1.5" />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Entries / Month</span>
                      <span className="font-medium">
                        {isPro ? '1,000' : isStarter ? '30' : '10'}
                      </span>
                    </div>
                    <Progress value={isPro ? 100 : isStarter ? 30 : 10} className="h-1.5" />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>AI Chats / Day</span>
                      <span className="font-medium">
                        {isPro ? '100' : isStarter ? '20' : '5'}
                      </span>
                    </div>
                    <Progress value={isPro ? 100 : isStarter ? 20 : 5} className="h-1.5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Available Plans</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = plan.name.toLowerCase() === currentTier
                return (
                  <Card key={plan.id} className={`flex flex-col ${isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''}`}>
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">KSH {plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          {Math.floor(plan.limits.recording_limit_seconds / 60)} mins recording
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          {plan.limits.entries_per_month} entries/month
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          {plan.limits.chats_per_day} AI chats/day
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {isCurrentPlan ? (
                        <Button className="w-full" disabled variant="outline">
                          Current Plan
                        </Button>
                      ) : (
                        <Link href="/pricing" className="w-full">
                          <Button className="w-full" variant={plan.price > 0 ? "default" : "secondary"}>
                            {plan.price > 0 ? "Upgrade" : "Downgrade"}
                          </Button>
                        </Link>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
