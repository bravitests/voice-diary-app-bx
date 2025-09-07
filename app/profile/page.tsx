"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ThemeSelector } from "@/components/theme-selector"
import { PurposeManager } from "@/components/purpose-manager"
import {
  User,
  Loader2,
  ArrowLeft,
  Settings,
  CreditCard,
  Shield,
  Mic,
  LogOut,
  Crown,
} from "lucide-react"

export default function ProfilePage() {
  const { user, updateProfile, logout, isLoading } = useAuth()
  const { context } = useMiniKit()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [notifications, setNotifications] = useState(true)
  const [autoSave, setAutoSave] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const handleSaveProfile = async () => {
    const success = await updateProfile(name, email)
    if (success) {
      alert("Profile updated successfully!")
    } else {
      alert("Failed to update profile. Please try again.")
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <User className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* User Info */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {context?.user?.pfpUrl ? (
                    <img 
                      src={context.user.pfpUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg text-card-foreground">{user.name || "User"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email || "No email set"}</p>
                </div>
                {user.isAdmin && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <Crown className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Profile Settings */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-card-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <Button onClick={handleSaveProfile} className="w-full">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Theme Selector */}
          <ThemeSelector />

          <PurposeManager />

          {/* App Settings */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <Mic className="w-4 h-4" />
                App Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-card-foreground">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get reminders to record your daily entries</p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-card-foreground">Auto-save Recordings</Label>
                  <p className="text-xs text-muted-foreground">Automatically save recordings when stopped</p>
                </div>
                <Switch checked={autoSave} onCheckedChange={setAutoSave} />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-transparent"
              onClick={() => router.push("/billing")}
            >
              <CreditCard className="w-4 h-4" />
              Billing & Subscription
            </Button>

            {user.isAdmin && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 bg-transparent"
                onClick={() => router.push("/admin")}
              >
                <Shield className="w-4 h-4" />
                Admin Dashboard
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive bg-transparent"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>

        </div>
      </main>
    </div>
  )
}
