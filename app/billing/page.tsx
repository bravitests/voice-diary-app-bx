"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Download,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { usePaymentContract } from "@/hooks/usePaymentContract"

interface SubscriptionStatus {
  tier: "free" | "pro"
  expiry: string | null
  isExpired: boolean
  limits: any
}

interface UsageStats {
  entriesThisMonth: number
  chatMessagesThisMonth: number
  storageMB: number
}

export default function BillingPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [pricing, setPricing] = useState(null)
  const [dataError, setDataError] = useState<string | null>(null)

  const {
    purchaseProSubscription,
    hasActivePro,
    subscriptionInfo,
    proPrice,
    isLoading: contractLoading,
    error: contractError,
    contractAddress
  } = usePaymentContract()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      fetchSubscriptionData()
      fetchPricing()
    }
  }, [user, hasActivePro, subscriptionInfo])

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/admin/pricing')
      const data = await response.json()
      setPricing(data.pricing)
    } catch (error) {
      console.error('Failed to fetch pricing:', error)
    }
  }

  const fetchSubscriptionData = async () => {
    if (!user) return

    try {
      setDataError(null)
      // Use contract data for subscription status
      const isActive = hasActivePro

      setSubscription({
        tier: isActive ? "pro" : "free",
        expiry: subscriptionInfo?.expiryDate?.toISOString() || null,
        isExpired: subscriptionInfo?.isExpired || false,
        limits: {
          maxRecordingDuration: isActive ? 300 : 120,
          maxEntriesPerMonth: isActive ? -1 : 50,
          maxChatMessagesPerMonth: isActive ? -1 : 20,
          maxStorageGB: isActive ? 10 : 1,
        },
      })

      // Fetch usage stats from API
      const response = await fetch(`/api/usage?userId=${user.id}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch usage data: ${response.status} ${response.statusText}`)
      }
      const usageData = await response.json()
      setUsage(usageData)
    } catch (error) {
      console.error("Error fetching subscription data:", error)
      setDataError(error instanceof Error ? error.message : "Failed to load subscription data")
    }
  }

  const handleUpgrade = async () => {
    if (!user || !contractAddress) {
      alert("Wallet not connected or contract not available. Please try again.")
      return
    }

    setIsUpgrading(true)
    try {
      const success = await purchaseProSubscription()

      if (success) {
        alert("Upgrade successful! Welcome to Pro!")
        // Data will refresh automatically via the hook
      } else {
        alert(contractError || "Upgrade failed. Please try again.")
      }
    } catch (error) {
      console.error("Upgrade failed:", error)
      alert("Upgrade failed. Please try again.")
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm(
      "Are you sure you want to cancel your subscription? You'll retain Pro features until your current billing period ends."
    )) {
      return
    }

    alert("Subscription cancellation is not available in this version. Your subscription will automatically expire after the billing period.")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !subscription || !usage) return null

  const currentPlan = subscription.tier
  const nextBillingDate = subscription.expiry ? new Date(subscription.expiry) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/profile")} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Billing</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Smart Contract Status */}
          {!contractAddress && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">Smart contract not configured. Please check your environment variables.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contract Error */}
          {contractError && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{contractError}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Plan */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-card-foreground capitalize">{currentPlan} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan === "free" ? "Limited features" : "Full access to all features"}
                  </p>
                </div>
                <Badge variant={currentPlan === "free" ? "secondary" : "default"}>
                  {currentPlan === "free" ? "Free" : "Pro"}
                </Badge>
              </div>
              {currentPlan !== "free" && nextBillingDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Next billing: {nextBillingDate.toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Error */}
          {dataError && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium">Failed to load data</p>
                    <p className="text-xs">{dataError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Stats with Progress Bars */}
          {usage && subscription && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base text-card-foreground">Usage This Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              {/* Voice Entries */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Voice entries</span>
                  <span className="font-medium text-card-foreground">
                    {usage.entriesThisMonth}
                    {subscription.limits.maxEntriesPerMonth > 0 && ` / ${subscription.limits.maxEntriesPerMonth}`}
                  </span>
                </div>
                {subscription.limits.maxEntriesPerMonth > 0 && (
                  <Progress
                    value={(usage.entriesThisMonth / subscription.limits.maxEntriesPerMonth) * 100}
                    className="h-2"
                  />
                )}
                {usage.entriesThisMonth >= subscription.limits.maxEntriesPerMonth &&
                  subscription.limits.maxEntriesPerMonth > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="w-3 h-3" />
                      Limit reached
                    </div>
                  )}
              </div>

              {/* Chat Messages */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">AI chat messages</span>
                  <span className="font-medium text-card-foreground">
                    {usage.chatMessagesThisMonth}
                    {subscription.limits.maxChatMessagesPerMonth > 0 &&
                      ` / ${subscription.limits.maxChatMessagesPerMonth}`}
                  </span>
                </div>
                {subscription.limits.maxChatMessagesPerMonth > 0 && (
                  <Progress
                    value={(usage.chatMessagesThisMonth / subscription.limits.maxChatMessagesPerMonth) * 100}
                    className="h-2"
                  />
                )}
              </div>

              {/* Storage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Storage used</span>
                  <span className="font-medium text-card-foreground">
                    {usage.storageMB} MB / {subscription.limits.maxStorageGB} GB
                  </span>
                </div>
                <Progress value={(usage.storageMB / (subscription.limits.maxStorageGB * 1024)) * 100} className="h-2" />
              </div>
              </CardContent>
            </Card>
          )}

          {/* Upgrade Plans */}
          {currentPlan === "free" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Upgrade Your Plan</h2>

              <Card className="border-primary bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Pro Plan
                    </CardTitle>
                    <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    {pricing ? (
                      <div>
                        <div className="text-3xl font-bold text-card-foreground">
                          ${pricing.monthly.usd}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          KSh {pricing.monthly.ksh.toLocaleString()} • {pricing.monthly.eth} ETH
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">per month</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl font-bold text-card-foreground">...</div>
                        <div className="text-sm text-muted-foreground">Loading pricing...</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Unlimited voice entries</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>5-minute recordings (vs 2-minute)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Advanced AI insights</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Unlimited AI chat</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Export entries</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>10GB storage (vs 1GB)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Priority support</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={handleUpgrade}
                      disabled={isUpgrading || contractLoading || !contractAddress || !pricing}
                    >
                      {(isUpgrading || contractLoading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {isUpgrading ? "Processing..." : `Upgrade to Pro Monthly`}
                    </Button>
                    
                    {pricing && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          Yearly: ${pricing.yearly.usd} (KSh {pricing.yearly.ksh.toLocaleString()}) - Save 2 months!
                        </p>
                      </div>
                    )}
                  </div>

                  {!contractAddress && (
                    <p className="text-xs text-muted-foreground text-center">
                      Smart contract not configured
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Billing History */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center justify-between">
                Billing History
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPlan === "free" ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No billing history available for free plan
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">Pro Plan</p>
                      <p className="text-xs text-muted-foreground">
                        {nextBillingDate ? nextBillingDate.toLocaleDateString() : "Current"}
                      </p>
                    </div>
                    <span className="font-medium text-card-foreground">
                      {pricing ? `$${pricing.monthly.usd}` : '...'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manage Subscription */}
          {currentPlan !== "free" && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive bg-transparent"
                onClick={handleCancel}
              >
                Cancel Subscription
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
