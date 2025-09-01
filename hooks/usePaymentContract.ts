import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'

// Contract ABI (simplified for the main functions)
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
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserSubscription",
    "outputs": [
      {"internalType": "uint8", "name": "tier", "type": "uint8"},
      {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
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

// Replace with your deployed contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined

// Validate contract address
if (typeof window !== 'undefined' && !CONTRACT_ADDRESS) {
  console.warn('NEXT_PUBLIC_CONTRACT_ADDRESS is not set - payment features will be disabled')
}

export function usePaymentContract() {
  const { address, isConnected } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Debug logging
  console.log('usePaymentContract - Address:', address)
  console.log('usePaymentContract - IsConnected:', isConnected)
  console.log('usePaymentContract - Contract Address:', CONTRACT_ADDRESS)

  const { writeContract, data: writeData, error: writeError, isPending } = useWriteContract()
  
  // Watch for transaction hash from writeContract
  useEffect(() => {
    if (writeData) {
      console.log('Transaction hash received:', writeData)
      setTxHash(writeData)
    }
  }, [writeData])
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt(
    txHash ? {
      hash: txHash as `0x${string}`,
    } : undefined
  )

  // Read PRO subscription price
  const { data: proPrice } = useReadContract(
    CONTRACT_ADDRESS ? {
      address: CONTRACT_ADDRESS,
      abi: PAYMENT_CONTRACT_ABI,
      functionName: 'subscriptionPrices',
      args: [1], // PRO tier
    } : undefined
  )

  // Check if user has active PRO subscription
  const { data: hasActivePro, refetch: refetchSubscription } = useReadContract(
    (address && CONTRACT_ADDRESS) ? {
      address: CONTRACT_ADDRESS,
      abi: PAYMENT_CONTRACT_ABI,
      functionName: 'hasActiveProSubscription',
      args: [address],
    } : undefined
  )

  // Get user subscription details
  const { data: subscriptionDetails } = useReadContract(
    (address && CONTRACT_ADDRESS) ? {
      address: CONTRACT_ADDRESS,
      abi: PAYMENT_CONTRACT_ABI,
      functionName: 'getUserSubscription',
      args: [address],
    } : undefined
  )

  const purchaseProSubscription = useCallback(async () => {
    console.log('=== purchaseProSubscription called ===')
    console.log('CONTRACT_ADDRESS:', CONTRACT_ADDRESS)
    console.log('address:', address)
    console.log('isConnected:', isConnected)
    console.log('proPrice:', proPrice)
    console.log('writeContract:', typeof writeContract)
    
    if (!CONTRACT_ADDRESS) {
      const errorMsg = 'Contract address not configured'
      console.error(errorMsg)
      setError(errorMsg)
      return false
    }
    
    if (!address) {
      const errorMsg = 'Wallet not connected'
      console.error(errorMsg)
      setError(errorMsg)
      return false
    }
    
    if (!proPrice) {
      const errorMsg = 'Price not loaded'
      console.error(errorMsg)
      setError(errorMsg)
      return false
    }

    setIsLoading(true)
    setError(null)
    setTxHash(null)

    try {
      console.log('Initiating purchase with price:', formatEther(proPrice), 'ETH')
      console.log('Contract call params:', {
        address: CONTRACT_ADDRESS,
        functionName: 'purchaseProSubscription',
        value: proPrice.toString()
      })
      
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: PAYMENT_CONTRACT_ABI,
        functionName: 'purchaseProSubscription',
        value: proPrice,
      })
      
      console.log('Transaction initiated')
      
      return true
    } catch (err: any) {
      console.error('Purchase failed:', err)
      console.error('Error details:', {
        message: err.message,
        shortMessage: err.shortMessage,
        code: err.code,
        cause: err.cause
      })
      setError(err.message || err.shortMessage || 'Purchase failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected, proPrice, writeContract])

  const getSubscriptionInfo = useCallback(() => {
    if (!subscriptionDetails) return null

    const [tier, expiryTimestamp, isActive, isExpired] = subscriptionDetails
    
    return {
      tier: tier === 1 ? 'pro' : 'free',
      expiryDate: new Date(Number(expiryTimestamp) * 1000),
      isActive,
      isExpired,
      daysRemaining: isActive && !isExpired 
        ? Math.ceil((Number(expiryTimestamp) * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
        : 0
    }
  }, [subscriptionDetails])

  return {
    // Contract interaction
    purchaseProSubscription,
    
    // Subscription status
    hasActivePro: !!hasActivePro,
    subscriptionInfo: getSubscriptionInfo(),
    
    // Pricing
    proPrice: proPrice ? formatEther(proPrice) : null,
    proPriceWei: proPrice,
    
    // Loading states
    isLoading: isLoading || isPending || isConfirming,
    error: error || writeError?.message,
    
    // Debug info
    debugInfo: {
      address,
      isConnected,
      contractAddress: CONTRACT_ADDRESS,
      writeError: writeError?.message,
      isPending
    },
    
    // Transaction status
    txHash,
    isConfirming,
    isConfirmed,
    
    // Utils
    refetchSubscription,
    contractAddress: CONTRACT_ADDRESS,
  }
}