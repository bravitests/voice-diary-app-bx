import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

const PAYMENT_CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "purchaseProSubscription",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined

export function useImprovedPaymentContract(userId?: string) {
  const { address, isConnected } = useAccount()
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [ethPrice, setEthPrice] = useState<string | null>(null)

  const { writeContract, data: writeData, isPending } = useWriteContract()
  
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt(
    txHash ? { hash: txHash as `0x${string}` } : undefined
  )

  // Start verification polling when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && txHash && userId) {
      startPaymentVerification(txHash, userId)
    }
  }, [isConfirmed, txHash, userId])

  const initiatePayment = useCallback(async () => {
    if (!userId || !address) {
      setError("User ID and wallet address required")
      return { success: false }
    }

    try {
      setError(null)
      
      // Get pricing and create payment tracking
      const response = await fetch('/api/subscription/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, walletAddress: address })
      })

      if (!response.ok) {
        throw new Error('Failed to initiate payment')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Payment initiation failed')
      }
      
      setPaymentId(result.paymentId)
      setEthPrice(result.amountEth)

      return { success: true, amountEth: result.amountEth }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initiation failed')
      return { success: false }
    }
  }, [userId, address])

  const executePayment = useCallback(async () => {
    if (!CONTRACT_ADDRESS || !ethPrice) {
      setError("Contract not configured or price not loaded")
      return { success: false }
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: PAYMENT_CONTRACT_ABI,
        functionName: 'purchaseProSubscription',
        value: parseEther(ethPrice),
      })

      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
      return { success: false }
    }
  }, [ethPrice, writeContract])

  const startPaymentVerification = useCallback(async (transactionHash: string, userId: string) => {
    setVerificationStatus('pending')
    
    // Update payment tracking with transaction hash
    await fetch('/api/subscription/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        transactionHash,
        action: 'update_hash'
      })
    })

    // Poll for verification
    let attempts = 0
    const maxAttempts = 4
    
    const pollVerification = async () => {
      if (attempts >= maxAttempts) {
        setVerificationStatus('failed')
        setError('Payment verification timeout')
        return
      }

      try {
        const response = await fetch('/api/subscription/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, transactionHash })
        })

        const result = await response.json()
        
        if (result.success && result.status === 'confirmed') {
          setVerificationStatus('confirmed')
          return
        }
        
        if (result.status === 'failed') {
          setVerificationStatus('failed')
          setError(result.message)
          return
        }

        // Continue polling
        attempts++
        setTimeout(pollVerification, 5000) // Poll every 5 seconds
        
      } catch (err) {
        attempts++
        setTimeout(pollVerification, 5000)
      }
    }

    pollVerification()
  }, [])

  // Track transaction hash from writeContract
  useEffect(() => {
    if (writeData) {
      setTxHash(writeData)
    }
  }, [writeData])

  const purchaseProSubscription = useCallback(async () => {
    const initResult = await initiatePayment()
    if (!initResult.success) return initResult

    return executePayment()
  }, [initiatePayment, executePayment])

  return {
    purchaseProSubscription,
    isLoading: isPending || verificationStatus === 'pending',
    isSuccess: verificationStatus === 'confirmed',
    error,
    txHash,
    verificationStatus,
    ethPrice,
    contractAddress: CONTRACT_ADDRESS
  }
}