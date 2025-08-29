"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
    if (!isLoading && user && !user.isAdmin) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

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
      <main className="px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">1,247</div>
                <div className="text-xs text-muted-foreground">Total Users</div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">8,932</div>
                <div className="text-xs text-muted-foreground">Voice Entries</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-card-foreground">New user registered</span>
                </div>
                <span className="text-xs text-muted-foreground">2m ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm text-card-foreground">Pro subscription activated</span>
                </div>
                <span className="text-xs text-muted-foreground">5m ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span className="text-sm text-card-foreground">Voice entry recorded</span>
                </div>
                <span className="text-xs text-muted-foreground">8m ago</span>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Response Time</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  142ms
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Server Uptime</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  99.9%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Storage Usage</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  78%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>

            <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-transparent">
              <Users className="w-4 h-4" />
              Manage Users
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

          {/* Recent Users */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Recent Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Sarah Johnson</p>
                  <p className="text-xs text-muted-foreground">sarah@example.com</p>
                </div>
                <Badge variant="secondary">Pro</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Mike Chen</p>
                  <p className="text-xs text-muted-foreground">mike@example.com</p>
                </div>
                <Badge variant="outline">Free</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Emma Davis</p>
                  <p className="text-xs text-muted-foreground">emma@example.com</p>
                </div>
                <Badge variant="secondary">Pro</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
