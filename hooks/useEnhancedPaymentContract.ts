import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { BillingError, BillingErrorType, createBillingError, parseBillingError } from '@/lib/billing-errors'
import { BillingService } from '@/lib/billing-service'

// Contract ABI (same as before)
const PAYMENT_CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "purchaseProSubscription",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "hasActiveProSubscription",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserSubscription",
    "outputs": [
      {"internalType": "uint8", "name": "tier", "type": "uint8"},
      {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"},
      {"internalType": "bool", "name": "isExpired", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "name": "subscriptionPrices",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined

export enum TransactionState {
  IDLE = 'idle',
  PREPARING = 'preparing',
  PENDING = 'pending',
  CONFIRMING = 'confirming',
  SUCCESS = 'success',
  FAILED = 'failed'
}

export function useEnhancedPaymentContract(userId?: string) {
  const { address, isConnected } = useAccount()
  const [transactionState, setTransactionState] = useState<TransactionState>(TransactionState.IDLE)
  const [billingError, setBillingError] = useState<BillingError | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle')
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle')

  const { writeContract, data: writeData, error: writeError, isPending } = useWriteContract()
  
  // Watch for transaction hash
  useEffect(() => {
    if (writeData) {
      setTxHash(writeData)
      setTransactionState(TransactionState.CONFIRMING)
    }
  }, [writeData])
  
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: txFailed } = useWaitForTransactionReceipt(
    txHash ? { hash: txHash as `0x${string}` } : undefined
  )

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && txHash && userId && address) {
      setTransactionState(TransactionState.SUCCESS)
      setVerificationStatus('pending') // Give user feedback that verification is happening on the backend
      notifyBackendOfTransaction(txHash, userId, address)
    } else if (txFailed) {
      setTransactionState(TransactionState.FAILED)
      setBillingError(createBillingError(BillingErrorType.TRANSACTION_FAILED))
      setVerificationStatus('failed')
    }
  }, [isConfirmed, txFailed, txHash, userId, address])

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      setTransactionState(TransactionState.FAILED)
      setBillingError(parseBillingError(writeError))
    }
  }, [writeError])

  // Read contract data
  const { data: proPrice, refetch: refetchPrice } = useReadContract(
    CONTRACT_ADDRESS ? {
      address: CONTRACT_ADDRESS,
      abi: PAYMENT_CONTRACT_ABI,
      functionName: 'subscriptionPrices',
      args: [1], // PRO tier
    } : undefined
  )

  const { data: hasActivePro, refetch: refetchSubscription } = useReadContract(
    (address && CONTRACT_ADDRESS) ? {
      address: CONTRACT_ADDRESS,
      abi: PAYMENT_CONTRACT_ABI,
      functionName: 'hasActiveProSubscription',
      args: [address],
    } : undefined
  )

  const { data: subscriptionDetails, refetch: refetchDetails } = useReadContract(
    (address && CONTRACT_ADDRESS) ? {
      address: CONTRACT_ADDRESS,
      abi: PAYMENT_CONTRACT_ABI,
      functionName: 'getUserSubscription',
      args: [address],
    } : undefined
  )



  const notifyBackendOfTransaction = useCallback(async (transactionHash: string, userId: string, walletAddress: string) => {
    try {
      await fetch('/api/transactions/submitted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, transactionHash, walletAddress })
      })
    } catch (error) {
      console.error("Failed to notify backend of transaction:", error)
      // Optional: handle this error, maybe show a message to the user
    }
  }, [])

  const purchaseProSubscription = useCallback(async () => {
    // Clear previous errors
    setBillingError(null)
    setTransactionState(TransactionState.PREPARING)

    // Validation checks
    if (!CONTRACT_ADDRESS) {
      const error = createBillingError(BillingErrorType.CONTRACT_ERROR, 'Contract not configured')
      setBillingError(error)
      setTransactionState(TransactionState.FAILED)
      return { success: false, error }
    }
    
    if (!address || !isConnected) {
      const error = createBillingError(BillingErrorType.WALLET_NOT_CONNECTED)
      setBillingError(error)
      setTransactionState(TransactionState.FAILED)
      return { success: false, error }
    }
    
    if (!proPrice) {
      const error = createBillingError(BillingErrorType.INVALID_PRICE)
      setBillingError(error)
      setTransactionState(TransactionState.FAILED)
      return { success: false, error }
    }

    try {
      setTransactionState(TransactionState.PENDING)
      
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: PAYMENT_CONTRACT_ABI,
        functionName: 'purchaseProSubscription',
        value: proPrice,
      })
      
      return { success: true }
    } catch (error) {
      const billingError = parseBillingError(error)
      setBillingError(billingError)
      setTransactionState(TransactionState.FAILED)
      return { success: false, error: billingError }
    }
  }, [address, isConnected, proPrice, writeContract])

  const retryTransaction = useCallback(() => {
    if (billingError?.retryable) {
      purchaseProSubscription()
    }
  }, [billingError, purchaseProSubscription])

  const clearError = useCallback(() => {
    setBillingError(null)
    setTransactionState(TransactionState.IDLE)
  }, [])

  const getSubscriptionInfo = useCallback(() => {
    if (!subscriptionDetails) return null

    const [tier, expiryTimestamp, isExpired] = subscriptionDetails
    const isActive = tier === 1 && !isExpired && Number(expiryTimestamp) * 1000 > Date.now()
    
    return {
      tier: tier === 1 ? 'pro' : 'free',
      expiryDate: new Date(Number(expiryTimestamp) * 1000),
      isActive,
      isExpired,
      daysRemaining: isActive 
        ? Math.ceil((Number(expiryTimestamp) * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
        : 0
    }
  }, [subscriptionDetails])

  return {
    // Core functions
    purchaseProSubscription,
    retryTransaction,
    clearError,
    
    // Subscription status
    hasActivePro: !!hasActivePro,
    subscriptionInfo: getSubscriptionInfo(),
    
    // Pricing
    proPrice: proPrice ? formatEther(proPrice) : null,
    proPriceWei: proPrice,
    
    // Transaction state
    transactionState,
    isLoading: transactionState === TransactionState.PREPARING || 
               transactionState === TransactionState.PENDING || 
               transactionState === TransactionState.CONFIRMING ||
               verificationStatus === 'pending',
    isSuccess: transactionState === TransactionState.SUCCESS && verificationStatus === 'confirmed',
    
    // Error handling
    error: billingError,
    
    // Sync status
    syncStatus,
    verificationStatus,
    
    // Transaction details
    txHash,
    
    // Utils
    refetchSubscription,
    refetchPrice,
    contractAddress: CONTRACT_ADDRESS,
    
    // Debug info
    debugInfo: {
      address,
      isConnected,
      contractAddress: CONTRACT_ADDRESS,
      transactionState,
      syncStatus,
      hasError: !!billingError
    }
  }
}
