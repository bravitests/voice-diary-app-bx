"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Plus, Check } from "lucide-react"
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet"
import { Name, Identity, Address, Avatar } from "@coinbase/onchainkit/identity"
import { useMiniKit, useAddFrame } from "@coinbase/onchainkit/minikit"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { color } from '@coinbase/onchainkit/theme'

export function WalletSection() {
  const { context } = useMiniKit()
  const { user } = useAuth()
  const router = useRouter()
  const [frameAdded, setFrameAdded] = useState(false)
  const addFrame = useAddFrame()

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard")
    }
  }

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame()
    setFrameAdded(Boolean(frameAdded))
  }, [addFrame])

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button variant="outline" size="sm" onClick={handleAddFrame} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Save Frame to Wallet
        </Button>
      )
    }

    if (frameAdded) {
      return (
        <div className="flex items-center justify-center space-x-2 text-sm font-medium text-green-600">
          <Check className="w-5 h-5" />
          <span>Saved to your Wallet</span>
        </div>
      )
    }

    return null
  }, [context, frameAdded, handleAddFrame])

  return (
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
          <div className="pt-2">{saveFrameButton}</div>
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
          
          <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
            <span>Free</span>
            <span>•</span>
            <span>AI Powered</span>
            <span>•</span>
            <span>Blockchain Secure</span>
          </div>
        </div>
      )}
    </div>
  )
}