// Complete Billing Service Integration

import { query } from "@/lib/database"
import { BillingError, BillingErrorType, createBillingError, parseBillingError } from "./billing-errors"

export interface TransactionStatus {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  gasUsed?: string
  effectiveGasPrice?: string
}

export interface SubscriptionSyncResult {
  success: boolean
  subscriptionUpdated: boolean
  error?: BillingError
}

export class BillingService {
  
  /**
   * Verify transaction on blockchain and sync with database
   */
  static async verifyAndSyncSubscription(
    userId: string, 
    transactionHash: string, 
    walletAddress: string
  ): Promise<SubscriptionSyncResult> {
    try {
      // First, verify the transaction exists and succeeded
      const txStatus = await this.getTransactionStatus(transactionHash)
      
      if (txStatus.status !== 'confirmed') {
        return {
          success: false,
          subscriptionUpdated: false,
          error: createBillingError(BillingErrorType.TRANSACTION_FAILED)
        }
      }

      // Check smart contract subscription status
      const contractStatus = await this.getContractSubscriptionStatus(walletAddress)
      
      if (!contractStatus.hasActivePro) {
        return {
          success: false,
          subscriptionUpdated: false,
          error: createBillingError(BillingErrorType.CONTRACT_ERROR, 'No active subscription found on contract')
        }
      }

      // Update database to match contract state
      const dbUpdateSuccess = await this.updateDatabaseSubscription(
        userId, 
        contractStatus.expiryDate, 
        transactionHash,
        contractStatus.amountPaid
      )

      if (!dbUpdateSuccess) {
        return {
          success: false,
          subscriptionUpdated: false,
          error: createBillingError(BillingErrorType.DATABASE_ERROR)
        }
      }

      return {
        success: true,
        subscriptionUpdated: true
      }

    } catch (error) {
      console.error('Subscription sync error:', error)
      return {
        success: false,
        subscriptionUpdated: false,
        error: parseBillingError(error)
      }
    }
  }

  /**
   * Get transaction status from blockchain
   */
  private static async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    // This would integrate with your blockchain provider (e.g., Alchemy, Infura)
    // For now, we'll simulate the check
    try {
      // In a real implementation, you'd use something like:
      // const receipt = await provider.getTransactionReceipt(txHash)
      
      // Simulated response - replace with actual blockchain call
      return {
        hash: txHash,
        status: 'confirmed', // This should come from actual blockchain
        blockNumber: 12345678,
        gasUsed: '21000',
        effectiveGasPrice: '20000000000'
      }
    } catch (error) {
      throw createBillingError(BillingErrorType.NETWORK_ERROR, 'Failed to verify transaction')
    }
  }

  /**
   * Get subscription status from smart contract
   */
  private static async getContractSubscriptionStatus(walletAddress: string) {
    // This would call your smart contract directly
    // For now, we'll simulate the response
    try {
      // In a real implementation, you'd use wagmi/viem to call:
      // const result = await readContract({ ... })
      
      // Simulated response - replace with actual contract call
      return {
        hasActivePro: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        amountPaid: '0.01' // ETH
      }
    } catch (error) {
      throw createBillingError(BillingErrorType.CONTRACT_ERROR, 'Failed to read contract state')
    }
  }

  /**
   * Update database subscription to match contract state
   */
  private static async updateDatabaseSubscription(
    userId: string, 
    expiryDate: Date, 
    transactionHash: string,
    amountPaid: string
  ): Promise<boolean> {
    try {
      // Update user subscription tier and expiry
      await query(
        `UPDATE users 
         SET subscription_tier = 'pro', subscription_expiry = $1, updated_at = NOW() 
         WHERE id = $2`,
        [expiryDate, userId]
      )

      // Insert subscription record
      await query(
        `INSERT INTO subscriptions (user_id, tier, status, end_date, transaction_hash, amount_paid)
         VALUES ($1, 'pro', 'active', $2, $3, $4)`,
        [userId, expiryDate, transactionHash, amountPaid]
      )

      return true
    } catch (error) {
      console.error('Database update error:', error)
      return false
    }
  }

  /**
   * Check if user's subscription status is in sync between contract and database
   */
  static async checkSubscriptionSync(userId: string, walletAddress: string): Promise<{
    inSync: boolean
    contractStatus: any
    databaseStatus: any
    recommendedAction?: string
  }> {
    try {
      // Get contract status
      const contractStatus = await this.getContractSubscriptionStatus(walletAddress)
      
      // Get database status
      const dbResult = await query(
        `SELECT subscription_tier, subscription_expiry FROM users WHERE id = $1`,
        [userId]
      )
      
      if (dbResult.rows.length === 0) {
        return {
          inSync: false,
          contractStatus,
          databaseStatus: null,
          recommendedAction: 'User not found in database'
        }
      }

      const databaseStatus = {
        tier: dbResult.rows[0].subscription_tier,
        expiry: dbResult.rows[0].subscription_expiry
      }

      // Check if they match
      const contractHasPro = contractStatus.hasActivePro
      const databaseHasPro = databaseStatus.tier === 'pro' && 
        new Date(databaseStatus.expiry) > new Date()

      const inSync = contractHasPro === databaseHasPro

      return {
        inSync,
        contractStatus,
        databaseStatus,
        recommendedAction: inSync ? undefined : 'Sync required'
      }

    } catch (error) {
      console.error('Sync check error:', error)
      return {
        inSync: false,
        contractStatus: null,
        databaseStatus: null,
        recommendedAction: 'Error checking sync status'
      }
    }
  }

  /**
   * Get user's current subscription limits based on their tier
   */
  static async getUserLimits(userId: string) {
    try {
      const result = await query(
        `SELECT subscription_tier, subscription_expiry FROM users WHERE id = $1`,
        [userId]
      )

      if (result.rows.length === 0) {
        throw createBillingError(BillingErrorType.DATABASE_ERROR, 'User not found')
      }

      const { subscription_tier, subscription_expiry } = result.rows[0]
      const isExpired = subscription_expiry && new Date(subscription_expiry) < new Date()
      const effectiveTier = isExpired ? 'free' : subscription_tier

      const limits = {
        free: {
          maxRecordingDuration: 120, // 2 minutes
          maxEntriesPerMonth: 50,
          maxChatMessagesPerMonth: 20,
          maxStorageGB: 1
        },
        pro: {
          maxRecordingDuration: 300, // 5 minutes
          maxEntriesPerMonth: -1, // unlimited
          maxChatMessagesPerMonth: -1, // unlimited
          maxStorageGB: 10
        }
      }

      return {
        tier: effectiveTier,
        limits: limits[effectiveTier as keyof typeof limits],
        isExpired
      }

    } catch (error) {
      console.error('Get user limits error:', error)
      throw parseBillingError(error)
    }
  }
}