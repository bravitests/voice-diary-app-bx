"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MessageCircle, ArrowRight, Wallet as WalletIcon } from "lucide-react"
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative">
              <Image src="/logo.png" alt="VoiceDiary Logo" width={32} height={32} className="rounded-lg" />
            </div>
            <span className="font-bold text-foreground">VoiceDiary</span>
          </div>
          <ThemeDropdown />
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 flex-1 flex items-center">
        <div className="max-w-md mx-auto w-full space-y-8">
          {/* Hero Content */}
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 relative">
                <Image src="/logo.png" alt="VoiceDiary Logo" width={64} height={64} className="rounded-2xl" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-balance text-foreground leading-tight">
              Your Voice, Your Story
            </h1>
            <p className="text-muted-foreground text-pretty leading-relaxed">
              Transform your thoughts into a personal audio diary with AI-powered insights.
            </p>
          </div>

          {/* Key Benefits - Simplified */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Natural Expression</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto">
                <MessageCircle className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm font-medium text-foreground">AI Insights</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-4">
            {user ? (
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                onClick={handleGetStarted}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-6">
                    Connect your wallet to get started
                  </p>
                  <Wallet>
                    <ConnectWallet className="w-full flex justify-center">
                      <div className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 min-w-[200px]">
                        <WalletIcon className="w-6 h-6" />
                        <span className="text-lg">Connect Wallet</span>
                      </div>
                    </ConnectWallet>
                    <WalletDropdown>
                      <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                        <Avatar />
                        <Name />
                        <Address />
                      </Identity>
                      <WalletDropdownDisconnect />
                    </WalletDropdown>
                  </Wallet>
                </div>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Free to start • Your privacy protected
            </p>
          </div>
        </div>
      </main>


    </div>
  )
}
