"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Loader2,
  ArrowLeft,
  Shield,
  Users,
  BarChart3,
  Settings,
  AlertTriangle,
  TrendingUp,
  Mic,
  MessageCircle,
  Crown,
  DollarSign,
  ExternalLink,
  Edit,
} from "lucide-react"
interface Pricing {
  monthly: {
    eth: number
    usd: number
    ksh: number
  }
  yearly: {
    eth: number
    usd: number
    ksh: number
  }
}

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)

  useEffect(() => {
    console.log('Admin page - user:', user, 'isLoading:', isLoading)

    if (!isLoading && !user) {
      console.log('No user, redirecting to home')
      router.push("/")
      return
    }

    if (!isLoading && user && !user.isAdmin) {
      console.log('User not admin, redirecting to dashboard. User admin status:', user.isAdmin)
      router.push("/dashboard")
      return
    }

    if (user?.isAdmin) {
      console.log('User is admin, fetching pricing')
      fetchPricing()
    }
  }, [user, isLoading, router])

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/admin/pricing')
      const data = await response.json()
      setPricing(data.pricing)
    } catch (error) {
      console.error('Failed to fetch pricing:', error)
    }
  }

  const updatePricing = async () => {
    if (!newPrice || !user) return

    setIsUpdatingPrice(true)
    try {
      const response = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUid: user.firebaseUid,
          newPriceUSD: parseFloat(newPrice),
          action: 'updatePrice'
        })
      })

      const data = await response.json()
      if (data.success) {
        setPricing(data.newPricing)
        setNewPrice('')
        alert('Pricing updated successfully!')
      } else {
        alert('Failed to update pricing: ' + data.error)
      }
    } catch (error) {
      console.error('Update pricing error:', error)
      alert('Failed to update pricing')
    } finally {
      setIsUpdatingPrice(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    console.log('No user found, showing null')
    return null
  }

  if (!user.isAdmin) {
    console.log('User is not admin:', user)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
          <p className="text-xs text-muted-foreground">User ID: {user.firebaseUid}</p>
          <p className="text-xs text-muted-foreground">Admin: {String(user.isAdmin)}</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/profile")} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Shield className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Admin Info */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="text-xs font-mono">{user.firebaseUid.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Admin</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Management */}
          {pricing && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base text-card-foreground flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Subscription Pricing
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Update Pricing</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="newPrice">New Monthly Price (USD)</Label>
                          <Input
                            id="newPrice"
                            type="number"
                            step="0.01"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="10.00"
                          />
                        </div>
                        <Button
                          onClick={updatePricing}
                          disabled={isUpdatingPrice || !newPrice}
                          className="w-full"
                        >
                          {isUpdatingPrice ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Update Pricing'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">${pricing.monthly.usd}</p>
                      <p className="text-xs text-muted-foreground">KSh {pricing.monthly.ksh.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{pricing.monthly.eth} ETH</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Yearly (10 months)</p>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">${pricing.yearly.usd}</p>
                      <p className="text-xs text-muted-foreground">KSh {pricing.yearly.ksh.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{pricing.yearly.eth} ETH</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contract Info */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Payment Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary">
                  Not Deployed
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Network</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Base
                </Badge>
              </div>
            </CardContent>
          </Card>





          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-transparent"
              onClick={() => router.push("/admin/users")}
            >
              <Users className="w-4 h-4" />
              Manage Users & Subscriptions
            </Button>

            <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-transparent">
              <MessageCircle className="w-4 h-4" />
              Review Feedback
            </Button>

            <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-transparent">
              <Settings className="w-4 h-4" />
              System Settings
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive bg-transparent"
            >
              <AlertTriangle className="w-4 h-4" />
              View Alerts
            </Button>
          </div>


        </div>
      </main>
    </div>
  )
}
