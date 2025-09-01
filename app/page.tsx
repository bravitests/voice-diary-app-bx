"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MessageCircle, ArrowRight, Wallet as WalletIcon, Sparkles } from "lucide-react"
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet"
import { Name, Identity, Address, Avatar } from "@coinbase/onchainkit/identity"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { ThemeDropdown } from "@/components/theme-dropdown"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LandingPage() {
  const { setFrameReady, isFrameReady } = useMiniKit()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Minimal Header */}
      <header className="px-6 py-4 flex-shrink-0">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative">
              <Image 
                src="/logo.png" 
                alt="VoiceDiary Logo" 
                width={32} 
                height={32} 
                className="rounded-xl" 
              />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">VoiceDiary</span>
          </div>
          <ThemeDropdown />
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-10">
          
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="relative">
              {/* Main Logo with Glow Effect */}
              <div className="w-20 h-20 mx-auto relative">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-lg"></div>
                <Image 
                  src="/logo.png" 
                  alt="VoiceDiary Logo" 
                  width={80} 
                  height={80} 
                  className="relative rounded-3xl shadow-lg" 
                />
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-2 -right-4">
                <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-accent" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-foreground leading-tight">
                Your Voice,<br />
                <span className="text-primary">Your Story</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Transform thoughts into personal audio diaries with AI-powered insights
              </p>
            </div>
          </div>

          {/* Quick Features */}
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Voice Recording</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">AI Analysis</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-6">
            {user ? (
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  onClick={handleGetStarted}
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                {/* User Info Card */}
                <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <WalletIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">Connected</p>
                      <p className="text-xs text-muted-foreground truncate">Ready to start journaling</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-6">
                    Connect your wallet to begin your journey
                  </p>
                  
                  <Wallet>
                    <ConnectWallet className="w-full">
                      <Button 
                        size="lg" 
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      >
                        <WalletIcon className="w-6 h-6 mr-3" />
                        Connect Wallet
                      </Button>
                    </ConnectWallet>
                    
                    <WalletDropdown>
                      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                        <Identity className="px-4 pt-4 pb-3 border-b border-border" hasCopyAddressOnClick>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10" />
                            <div className="flex-1 min-w-0">
                              <Name className="font-medium text-card-foreground" />
                              <Address className="text-sm text-muted-foreground" />
                            </div>
                          </div>
                        </Identity>
                        <div className="p-2">
                          <WalletDropdownDisconnect className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors" />
                        </div>
                      </div>
                    </WalletDropdown>
                  </Wallet>
                </div>
                
                {/* Trust Indicators */}
                <div className="flex items-center justify-center gap-6 pt-2">
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground">Free</p>
                  </div>
                  <div className="w-1 h-1 bg-muted-foreground/30 rounded-full"></div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground">Secure</p>
                  </div>
                  <div className="w-1 h-1 bg-muted-foreground/30 rounded-full"></div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground">Private</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="px-6 py-4 flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <p className="text-xs text-center text-muted-foreground/70">
            Your personal voice diary with AI insights
          </p>
        </div>
      </footer>
    </div>
  )
}