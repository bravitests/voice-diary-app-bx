import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
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
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { writeContract } = useWriteContract()

  // Read PRO subscription price
  const { data: proPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PAYMENT_CONTRACT_ABI,
    functionName: 'subscriptionPrices',
    args: [1], // PRO tier
    enabled: !!CONTRACT_ADDRESS,
  })

  // Check if user has active PRO subscription
  const { data: hasActivePro, refetch: refetchSubscription } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PAYMENT_CONTRACT_ABI,
    functionName: 'hasActiveProSubscription',
    args: address ? [address] : undefined,
    enabled: !!address && !!CONTRACT_ADDRESS,
  })

  // Get user subscription details
  const { data: subscriptionDetails } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PAYMENT_CONTRACT_ABI,
    functionName: 'getUserSubscription',
    args: address ? [address] : undefined,
    enabled: !!address && !!CONTRACT_ADDRESS,
  })

  const purchaseProSubscription = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setError('Contract address not configured')
      return false
    }
    
    if (!address || !proPrice) {
      setError('Wallet not connected or price not loaded')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: PAYMENT_CONTRACT_ABI,
        functionName: 'purchaseProSubscription',
        value: proPrice,
      })

      // Refetch subscription status after purchase
      setTimeout(() => {
        refetchSubscription()
      }, 2000)

      return true
    } catch (err: any) {
      console.error('Purchase failed:', err)
      setError(err.message || 'Purchase failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [address, proPrice, writeContract, refetchSubscription])

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
    isLoading,
    error,
    
    // Utils
    refetchSubscription,
    contractAddress: CONTRACT_ADDRESS,
  }
}