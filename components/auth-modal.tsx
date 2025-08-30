"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Loader2, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { isWalletConnected } = useAuth()

  if (!isOpen) return null

  const handleWalletConnect = async () => {
    setIsLoading(true)
    setError("")

    try {
      // The wallet connection is handled by OnchainKit's ConnectWallet component
      // This modal should close when connection is successful
      if (isWalletConnected) {
        onSuccess()
        onClose()
      } else {
        setError("Please use the Connect Wallet button in the header to connect your wallet.")
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <Card className="relative w-full max-w-sm bg-card border-border shadow-2xl">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Wallet className="w-3 h-3 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg text-card-foreground">Connect Wallet</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Base wallet to start your voice journaling journey
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {isWalletConnected ? (
              <Button onClick={() => { onSuccess(); onClose(); }} className="w-full" size="lg">
                <Wallet className="w-4 h-4 mr-2" />
                Continue to App
              </Button>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Please use the "Connect Wallet" button in the header above to connect your Base wallet.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              You'll be able to add your name and email in your profile after connecting
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
