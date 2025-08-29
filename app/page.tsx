"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, BookOpen, MessageCircle, Shield, Sparkles, ArrowRight } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard")
    } else {
      setShowAuthModal(true)
    }
  }

  const handleAuthSuccess = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <Image src="/logo.png" alt="VoiceDiary Logo" width={40} height={40} className="rounded-lg" />
            </div>
            <span className="font-bold text-lg text-foreground">VoiceDiary</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 pb-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Hero Content */}
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 relative">
                <Image src="/logo.png" alt="VoiceDiary Logo" width={80} height={80} className="rounded-2xl" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-balance text-foreground leading-tight">
              Your Voice, Your Story, Your Journey
            </h1>
            <p className="text-muted-foreground text-pretty leading-relaxed">
              Transform your thoughts into a personal audio diary. Speak your mind, reflect on your day, and discover
              insights through the power of voice.
            </p>
          </div>

          {/* Benefits Cards */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mic className="w-5 h-5 text-accent" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-card-foreground">Natural Expression</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Speak naturally without the pressure of writing. Your authentic voice captures emotions and thoughts
                    more genuinely.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-card-foreground">Effortless Journaling</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    No more blank page syndrome. Simply press record and let your thoughts flow naturally, anytime,
                    anywhere.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-secondary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-card-foreground">AI-Powered Insights</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Chat with your diary entries and discover patterns, emotions, and insights you might have missed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-accent" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-card-foreground">Private & Secure</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your personal thoughts stay private with end-to-end encryption and secure cloud storage.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Why Voice Journaling Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-foreground">Why Voice Journaling Works</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Faster than writing:</span> Speak 3x faster than you can
                  type, capturing thoughts in real-time.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">More emotional depth:</span> Voice carries tone, pace,
                  and emotion that text cannot convey.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Accessible anywhere:</span> Record while walking,
                  commuting, or whenever inspiration strikes.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-4 pt-4">
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={handleGetStarted}
            >
              {user ? "Go to Dashboard" : "Start Your Voice Journey"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Free to start • No credit card required • Your privacy protected
            </p>
          </div>
        </div>
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  )
}
