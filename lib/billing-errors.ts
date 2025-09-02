// Billing Error Types and User-Friendly Messages

export enum BillingErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SUBSCRIPTION_SYNC_ERROR = 'SUBSCRIPTION_SYNC_ERROR',
  ALREADY_SUBSCRIBED = 'ALREADY_SUBSCRIBED',
  INVALID_PRICE = 'INVALID_PRICE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface BillingError {
  type: BillingErrorType
  message: string
  userMessage: string
  retryable: boolean
  action?: string
}

export const BILLING_ERRORS: Record<BillingErrorType, Omit<BillingError, 'type'>> = {
  [BillingErrorType.WALLET_NOT_CONNECTED]: {
    message: 'Wallet not connected',
    userMessage: 'Please connect your wallet to upgrade to Pro',
    retryable: true,
    action: 'Connect Wallet'
  },
  [BillingErrorType.INSUFFICIENT_FUNDS]: {
    message: 'Insufficient funds for transaction',
    userMessage: 'You don\'t have enough ETH to complete this purchase. Please add funds to your wallet.',
    retryable: true,
    action: 'Add Funds'
  },
  [BillingErrorType.TRANSACTION_REJECTED]: {
    message: 'Transaction rejected by user',
    userMessage: 'Transaction was cancelled. You can try again when ready.',
    retryable: true,
    action: 'Try Again'
  },
  [BillingErrorType.TRANSACTION_FAILED]: {
    message: 'Transaction failed on blockchain',
    userMessage: 'Transaction failed. This could be due to network congestion or insufficient gas. Please try again.',
    retryable: true,
    action: 'Retry Transaction'
  },
  [BillingErrorType.CONTRACT_ERROR]: {
    message: 'Smart contract error',
    userMessage: 'There was an issue with the payment contract. Please try again or contact support.',
    retryable: true,
    action: 'Contact Support'
  },
  [BillingErrorType.NETWORK_ERROR]: {
    message: 'Network connection error',
    userMessage: 'Network connection issue. Please check your internet connection and try again.',
    retryable: true,
    action: 'Retry'
  },
  [BillingErrorType.SUBSCRIPTION_SYNC_ERROR]: {
    message: 'Failed to sync subscription status',
    userMessage: 'Your payment was processed but there was an issue updating your account. Please contact support.',
    retryable: false,
    action: 'Contact Support'
  },
  [BillingErrorType.ALREADY_SUBSCRIBED]: {
    message: 'User already has active subscription',
    userMessage: 'You already have an active Pro subscription. Your current plan will be extended.',
    retryable: false
  },
  [BillingErrorType.INVALID_PRICE]: {
    message: 'Invalid or missing price data',
    userMessage: 'Unable to load current pricing. Please refresh the page and try again.',
    retryable: true,
    action: 'Refresh Page'
  },
  [BillingErrorType.DATABASE_ERROR]: {
    message: 'Database operation failed',
    userMessage: 'There was an issue updating your account. Please contact support if this persists.',
    retryable: true,
    action: 'Contact Support'
  },
  [BillingErrorType.UNKNOWN_ERROR]: {
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    retryable: true,
    action: 'Contact Support'
  }
}

export function createBillingError(type: BillingErrorType, customMessage?: string): BillingError {
  const errorTemplate = BILLING_ERRORS[type]
  return {
    type,
    message: customMessage || errorTemplate.message,
    userMessage: errorTemplate.userMessage,
    retryable: errorTemplate.retryable,
    action: errorTemplate.action
  }
}

export function parseBillingError(error: any): BillingError {
  const errorMessage = error?.message || error?.shortMessage || String(error)
  
  // Parse common error patterns
  if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
    return createBillingError(BillingErrorType.TRANSACTION_REJECTED)
  }
  
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
    return createBillingError(BillingErrorType.INSUFFICIENT_FUNDS)
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return createBillingError(BillingErrorType.NETWORK_ERROR)
  }
  
  if (errorMessage.includes('contract') || errorMessage.includes('revert')) {
    return createBillingError(BillingErrorType.CONTRACT_ERROR, errorMessage)
  }
  
  return createBillingError(BillingErrorType.UNKNOWN_ERROR, errorMessage)
}