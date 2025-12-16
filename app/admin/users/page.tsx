"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Loader2,
  ArrowLeft,
  Users,
  Crown,
  Shield,
  UserPlus,
  UserMinus,
  Search,
} from "lucide-react"

interface User {
  id: string
  firebaseUid: string
  name?: string
  email?: string
  subscriptionTier: string
  subscriptionExpiry?: string
  isAdmin: boolean
  createdAt: string
  recordingCount: number
}

interface Stats {
  totalUsers: number
  proUsers: number
  adminUsers: number
}

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
    if (!isLoading && user && !user.isAdmin) {
      router.push("/dashboard")
    }
    if (user?.isAdmin) {
      fetchUsers()
    }
  }, [user, isLoading, router])

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true)
      const response = await fetch(`/api/admin/users?adminUid=${user?.firebaseUid}`)
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
        setStats(data.stats)
      } else {
        alert('Failed to fetch users: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      alert('Failed to fetch users')
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleAdminAction = async (targetUid: string, action: string) => {
    if (!user) return

    setActionLoading(targetUid)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUid: user.firebaseUid,
          targetUid,
          action
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(data.message)
        fetchUsers() // Refresh the list
      } else {
        alert('Failed: ' + data.error)
      }
    } catch (error) {
      console.error('Admin action error:', error)
      alert('Failed to perform action')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredUsers = users.filter(u =>
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.firebaseUid || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !user.isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">User Management</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        <div className="max-w-md mx-auto space-y-6">

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border bg-card">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-card-foreground">{stats.totalUsers}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-card-foreground">{stats.proUsers}</div>
                  <div className="text-xs text-muted-foreground">Pro Users</div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-card-foreground">{stats.adminUsers}</div>
                  <div className="text-xs text-muted-foreground">Admins</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users List */}
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {users.length === 0 ? "No users found" : "No users match your search"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <Card key={u.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {u.name || "Unnamed User"}
                          </p>
                          {u.isAdmin && <Shield className="w-3 h-3 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email || u.firebaseUid.slice(0, 8) + "..."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.subscriptionTier === 'pro' ? 'default' : 'secondary'}>
                          {u.subscriptionTier}
                        </Badge>
                        {u.isAdmin && (
                          <Badge variant="outline" className="text-primary border-primary">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{u.recordingCount} recordings</span>
                      <span>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Admin Actions */}
                    {u.firebaseUid !== user.firebaseUid && (
                      <div className="flex gap-2">
                        {!u.isAdmin ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdminAction(u.firebaseUid, 'makeAdmin')}
                            disabled={actionLoading === u.firebaseUid}
                            className="flex-1"
                          >
                            {actionLoading === u.firebaseUid ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3 mr-1" />
                                Make Admin
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdminAction(u.firebaseUid, 'removeAdmin')}
                            disabled={actionLoading === u.firebaseUid}
                            className="flex-1 text-destructive hover:text-destructive"
                          >
                            {actionLoading === u.firebaseUid ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="w-3 h-3 mr-1" />
                                Remove Admin
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
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