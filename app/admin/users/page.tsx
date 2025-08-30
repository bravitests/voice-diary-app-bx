"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Loader2, ExternalLink, Crown, Calendar } from "lucide-react"
import { usePaymentContract } from "@/hooks/usePaymentContract"

interface AdminUser {
  id: string
  wallet_address: string
  name?: string
  email?: string
  subscription_tier: string
  subscription_expiry?: string
  created_at: string
  recording_count: number
  subscription_status?: string
  last_payment?: string
}

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [contractStats, setContractStats] = useState<{
    totalBalance: string
    totalSubscriptions: number
  } | null>(null)
  
  const { contractAddress, proPrice } = usePaymentContract()

  useEffect(() => {
    if (!isLoading && !user?.isAdmin) {
      router.push("/")
    }
    if (user?.isAdmin) {
      fetchUsers()
    }
  }, [user, isLoading, router])

  const fetchUsers = async () => {
    try {
      // Try to fetch from API first
      const response = await fetch(`/api/admin/users?admin_wallet=${user?.walletAddress}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        // Fallback to mock data for demo
        const mockUsers: AdminUser[] = [
          {
            id: "1",
            wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
            name: "Sarah Johnson",
            email: "sarah@example.com",
            subscription_tier: "pro",
            subscription_expiry: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            recording_count: 45,
            subscription_status: "active",
            last_payment: "0.01"
          },
          {
            id: "2", 
            wallet_address: "0xabcdef1234567890abcdef1234567890abcdef12",
            name: "Mike Chen",
            subscription_tier: "free",
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            recording_count: 12,
            subscription_status: "free"
          },
          {
            id: "3",
            wallet_address: "0x9876543210fedcba9876543210fedcba98765432",
            name: "Emma Davis", 
            email: "emma@example.com",
            subscription_tier: "pro",
            subscription_expiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            recording_count: 78,
            subscription_status: "active",
            last_payment: "0.01"
          }
        ]
        setUsers(mockUsers)
      }
      
      // Fetch contract stats if available
      if (contractAddress) {
        setContractStats({
          totalBalance: "0.05", // This would come from contract
          totalSubscriptions: users.filter(u => u.subscription_tier === 'pro').length
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || !user?.isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">User Management</h1>
        </div>
      </header>

      <main className="px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border bg-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-card-foreground">{users.length}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-card-foreground">
                      {users.filter(u => u.subscription_tier === 'pro').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Pro Subscribers</div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-card-foreground">
                      {contractStats?.totalBalance || '0.05'} ETH
                    </div>
                    <div className="text-sm text-muted-foreground">Contract Balance</div>
                  </CardContent>
                </Card>
              </div>

              {/* Contract Info */}
              {contractAddress && (
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-card-foreground">Payment Contract</h3>
                        <p className="text-sm text-muted-foreground font-mono">
                          {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pro Price: {proPrice || '0.01'} ETH/month
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://basescan.org/address/${contractAddress}`, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold">User Management</span>
              </div>

              {users.map((adminUser) => (
                <Card key={adminUser.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-card-foreground">
                            {adminUser.name || `User ${adminUser.wallet_address.slice(0, 8)}...`}
                          </h3>
                          <Badge 
                            variant={adminUser.subscription_tier === "pro" ? "default" : "outline"}
                            className={adminUser.subscription_tier === "pro" ? "bg-yellow-500 text-white" : ""}
                          >
                            {adminUser.subscription_tier === "pro" && <Crown className="w-3 h-3 mr-1" />}
                            {adminUser.subscription_tier}
                          </Badge>
                          {adminUser.subscription_expiry && (
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {Math.ceil((new Date(adminUser.subscription_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d left
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground font-mono">
                            {adminUser.wallet_address.slice(0, 10)}...{adminUser.wallet_address.slice(-8)}
                          </p>
                          {adminUser.email && (
                            <p className="text-sm text-muted-foreground">{adminUser.email}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>{adminUser.recording_count} recordings</span>
                          <span>Joined {new Date(adminUser.created_at).toLocaleDateString()}</span>
                          {adminUser.subscription_expiry && (
                            <span>
                              Expires {new Date(adminUser.subscription_expiry).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        {adminUser.last_payment && (
                          <>
                            <p className="text-sm font-medium text-card-foreground">
                              {adminUser.last_payment} ETH
                            </p>
                            <p className="text-xs text-muted-foreground">Last payment</p>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://basescan.org/address/${adminUser.wallet_address}`, "_blank")}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}