"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Crown, Check } from "lucide-react"
import { useEnhancedPaymentContract } from "@/hooks/useEnhancedPaymentContract"
import { useAuth } from "@/contexts/auth-context"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useAuth()
  const { 
    purchaseProSubscription, 
    hasActivePro, 
    proPrice, 
    subscriptionInfo,
    isLoading: contractLoading,
    error,
    transactionState,
    verificationStatus
  } = useEnhancedPaymentContract(user?.id)

  if (!isOpen) return null

  const handlePurchase = async () => {
    setIsProcessing(true)
    
    try {
      const success = await purchaseProSubscription()
      if (success) {
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      console.error('Purchase error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const isLoading = contractLoading || isProcessing || transactionState === 'pending' || transactionState === 'confirming' || verificationStatus === 'pending'

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-md bg-card border-border shadow-2xl">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded-md flex items-center justify-center">
                <Crown className="w-3 h-3 text-white" />
              </div>
              <CardTitle className="text-lg text-card-foreground">Upgrade to Pro</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current Status */}
          {hasActivePro && subscriptionInfo && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Active Pro Subscription
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-300">
                {subscriptionInfo.daysRemaining} days remaining
              </p>
            </div>
          )}

          {/* Pro Features */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Pro Features</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Unlimited voice entries</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Advanced AI insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Export your entries</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Priority support</span>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 bg-accent/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Pro Monthly</p>
                <p className="text-sm text-muted-foreground">30 days access</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  {proPrice ? `${proPrice} ETH` : '...'}
                </p>
                <Badge variant="secondary" className="text-xs">
                  ~$15 USD
                </Badge>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-300">{error.userMessage}</p>
            </div>
          )}

          {/* Purchase Button */}
          <div className="space-y-3">
            {!user ? (
              <p className="text-sm text-center text-muted-foreground">
                Please connect your wallet first
              </p>
            ) : (
              <Button
                onClick={handlePurchase}
                disabled={isLoading || !proPrice}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                size="lg"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Crown className="w-4 h-4 mr-2" />
                {hasActivePro ? 'Extend Pro Subscription' : 'Upgrade to Pro'}
              </Button>
            )}
            
            <p className="text-xs text-center text-muted-foreground">
              Secure payment via smart contract • Cancel anytime
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}