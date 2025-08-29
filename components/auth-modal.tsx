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

  const { connectWallet } = useAuth()

  if (!isOpen) return null

  const handleWalletConnect = async () => {
    setIsLoading(true)
    setError("")

    try {
      const success = await connectWallet()

      if (success) {
        onSuccess()
        onClose()
      } else {
        setError("Wallet connection failed. Please try again.")
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm bg-card border-border">
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

            <Button onClick={handleWalletConnect} className="w-full" disabled={isLoading} size="lg">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Wallet className="w-4 h-4 mr-2" />
              Connect Base Wallet
            </Button>

            <p className="text-xs text-muted-foreground">
              You'll be able to add your name and email in your profile after connecting
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
