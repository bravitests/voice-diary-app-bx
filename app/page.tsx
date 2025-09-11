"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Wallet as WalletIcon, Plus, Check } from "lucide-react" 
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet"
import { Name, Identity, Address, Avatar } from "@coinbase/onchainkit/identity"
import { useMiniKit, useAddFrame } from "@coinbase/onchainkit/minikit" 
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { color } from '@coinbase/onchainkit/theme';

export default function LandingPage() {
  const { setFrameReady, isFrameReady, context } = useMiniKit()
  const { user } = useAuth()
  const router = useRouter()

  // New: State and hooks for the "Save Frame" feature
  const [frameAdded, setFrameAdded] = useState(false)
  const addFrame = useAddFrame()

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
  

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddFrame}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Save Frame to Wallet
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center justify-center space-x-2 text-sm font-medium text-green-600">
          <Check className="w-5 h-5" />
          <span>Saved to your Wallet</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header is unchanged */}
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
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content is unchanged */}
      <main className="flex-1 flex items-center justify-center px-6 py-4">
        <div className="max-w-sm mx-auto w-full space-y-8">
          
          <div className="text-center space-y-8">
            <div className="relative mx-auto">
              <Image 
                src="/hero.png" 
                alt="VoiceDiary Hero" 
                width={280} 
                height={320} 
                className="mx-auto" 
                priority
              />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground leading-tight">
                Your Voice,<br />
                <span className="text-primary">Your Story</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed px-4">
                Transform thoughts into personal audio diaries with AI-powered insights
              </p>
            </div>
          </div>

          <div className="space-y-6 pt-4">
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
                
                
                <div className="pt-2">
                  {saveFrameButton}
                </div>
              </div>
            ) : (
             
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Get Started</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Connect your wallet to begin your journey
                  </p>
                  <div className="flex justify-center">
                  <Wallet>
                    <ConnectWallet className="bg-blue-800">
                      <Avatar className="h-6 w-6"/>
                      <Name />
                    </ConnectWallet>
                    <WalletDropdown>
                      <Identity className="px-4 pt-3 pb-2 r" hasCopyAddressOnClick>
                        <Avatar />
                        <Name />
                        <Address className={color.foregroundMuted} />
                      </Identity>
                      <WalletDropdownDisconnect />
                    </WalletDropdown>
                  </Wallet>
                  </div>
                </div>
                
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
    </div>
  )
}