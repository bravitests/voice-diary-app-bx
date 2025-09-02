"use client"

import { BillingError } from "@/lib/billing-errors"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, ExternalLink, Wallet } from "lucide-react"

interface BillingErrorDisplayProps {
  error: BillingError
  onRetry?: () => void
  onDismiss?: () => void
}

export function BillingErrorDisplay({ error, onRetry, onDismiss }: BillingErrorDisplayProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'WALLET_NOT_CONNECTED':
        return <Wallet className="w-5 h-5" />
      case 'NETWORK_ERROR':
        return <RefreshCw className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getErrorColor = () => {
    switch (error.type) {
      case 'WALLET_NOT_CONNECTED':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
      case 'INSUFFICIENT_FUNDS':
        return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
      case 'TRANSACTION_REJECTED':
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20'
      default:
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
    }
  }

  const getTextColor = () => {
    switch (error.type) {
      case 'WALLET_NOT_CONNECTED':
        return 'text-blue-800 dark:text-blue-200'
      case 'INSUFFICIENT_FUNDS':
        return 'text-amber-800 dark:text-amber-200'
      case 'TRANSACTION_REJECTED':
        return 'text-gray-800 dark:text-gray-200'
      default:
        return 'text-red-800 dark:text-red-200'
    }
  }

  return (
    <Card className={`${getErrorColor()} border`}>
      <CardContent className="p-4">
        <div className={`flex items-start gap-3 ${getTextColor()}`}>
          {getErrorIcon()}
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">{error.userMessage}</p>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              {error.retryable && onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="h-8 text-xs"
                >
                  {error.action || 'Try Again'}
                </Button>
              )}
              
              {error.action === 'Contact Support' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('mailto:support@voicediary.app', '_blank')}
                  className="h-8 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Contact Support
                </Button>
              )}
              
              {error.action === 'Add Funds' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('https://bridge.base.org', '_blank')}
                  className="h-8 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Add Funds
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="h-8 text-xs"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}