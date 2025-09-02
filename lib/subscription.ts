// Subscription management and tier enforcement
import { query } from "@/lib/database"
import { updateUserRateLimit } from "@/lib/gemini-ai"

export interface SubscriptionLimits {
  maxRecordingDuration: number // in seconds
  maxEntriesPerMonth: number
  maxChatMessagesPerMonth: number
  maxStorageGB: number
  hasAdvancedInsights: boolean
  hasExportFeatures: boolean
  hasPrioritySupport: boolean
  hasCloudBackup: boolean
}

export const SUBSCRIPTION_LIMITS: Record<"free" | "pro", SubscriptionLimits> = {
  free: {
    maxRecordingDuration: 120, // 2 minutes
    maxEntriesPerMonth: 50,
    maxChatMessagesPerMonth: 20,
    maxStorageGB: 1,
    hasAdvancedInsights: false,
    hasExportFeatures: false,
    hasPrioritySupport: false,
    hasCloudBackup: false,
  },
  pro: {
    maxRecordingDuration: 300, // 5 minutes
    maxEntriesPerMonth: -1, // unlimited
    maxChatMessagesPerMonth: -1, // unlimited
    maxStorageGB: 10,
    hasAdvancedInsights: true,
    hasExportFeatures: true,
    hasPrioritySupport: true,
    hasCloudBackup: true,
  },
}


export async function getUserSubscriptionStatus(userId: string) {
  try {
    const user = await query("SELECT subscription_tier, subscription_expiry FROM users WHERE id = $1", [userId])

    if (user.rows.length === 0) {
      throw new Error("User not found")
    }

    const { subscription_tier, subscription_expiry } = user.rows[0]

    // Check if subscription is expired
    const isExpired = subscription_expiry && new Date(subscription_expiry) < new Date()

    const effectiveTier = isExpired ? "free" : subscription_tier

    return {
      tier: effectiveTier as "free" | "pro",
      expiry: subscription_expiry,
      isExpired,
      limits: SUBSCRIPTION_LIMITS[effectiveTier as "free" | "pro"],
    }
  } catch (error) {
    console.error("[v0] Error getting subscription status:", error)
    return {
      tier: "free" as const,
      expiry: null,
      isExpired: false,
      limits: SUBSCRIPTION_LIMITS.free,
    }
  }
}

export async function getUserUsageStats(userId: string) {
  try {
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    // Get recordings count for current month
    const recordingsResult = await query(
      "SELECT COUNT(*) as count FROM recordings WHERE user_id = $1 AND created_at >= $2 AND created_at < $3",
      [userId, currentMonth, nextMonth],
    )

    // Get chat messages count for current month
    const chatResult = await query(
      `SELECT COUNT(*) as count FROM chat_messages cm 
       JOIN chat_sessions cs ON cm.session_id = cs.id 
       WHERE cs.user_id = $1 AND cm.role = 'user' AND cm.created_at >= $2 AND cm.created_at < $3`,
      [userId, currentMonth, nextMonth],
    )

    // Get storage usage (rough estimate based on recording count)
    const storageResult = await query("SELECT COUNT(*) * 2 as storage_mb FROM recordings WHERE user_id = $1", [
      userId,
    ])

    return {
      entriesThisMonth: Number.parseInt(recordingsResult.rows[0].count),
      chatMessagesThisMonth: Number.parseInt(chatResult.rows[0].count),
      storageMB: Number.parseInt(storageResult.rows[0].storage_mb || "0"),
    }
  } catch (error) {
    console.error("[v0] Error getting usage stats:", error)
    return {
      entriesThisMonth: 0,
      chatMessagesThisMonth: 0,
      storageMB: 0,
    }
  }
}

export async function checkUsageLimit(
  userId: string,
  limitType: "recording" | "chat",
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const subscription = await getUserSubscriptionStatus(userId)
    const usage = await getUserUsageStats(userId)

    if (limitType === "recording") {
      if (subscription.limits.maxEntriesPerMonth === -1) {
        return { allowed: true }
      }

      if (usage.entriesThisMonth >= subscription.limits.maxEntriesPerMonth) {
        return {
          allowed: false,
          reason: `Monthly recording limit reached (${subscription.limits.maxEntriesPerMonth}). Upgrade to Pro for unlimited recordings.`,
        }
      }
    }

    if (limitType === "chat") {
      if (subscription.limits.maxChatMessagesPerMonth === -1) {
        return { allowed: true }
      }

      if (usage.chatMessagesThisMonth >= subscription.limits.maxChatMessagesPerMonth) {
        return {
          allowed: false,
          reason: `Monthly chat limit reached (${subscription.limits.maxChatMessagesPerMonth}). Upgrade to Pro for unlimited chat.`,
        }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error("[v0] Error checking usage limit:", error)
    return { allowed: true } // Allow on error to avoid blocking users
  }
}

export async function upgradeSubscription(
  userId: string,
  tier: "pro",
  transactionHash: string,
  amountPaid: string,
): Promise<boolean> {
  try {
    // Update user subscription tier
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + 1) // 1 month subscription

    await query("UPDATE users SET subscription_tier = $1, subscription_expiry = $2 WHERE id = $3", [
      tier,
      expiry,
      userId,
    ])

    // Update rate limits
    updateUserRateLimit(userId, tier)

    console.log("[v0] Subscription upgraded successfully", { userId, tier, transactionHash })
    return true
  } catch (error) {
    console.error("[v0] Error upgrading subscription:", error)
    return false
  }
}

export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    // Mark current subscription as cancelled
    await query("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'", [userId])

    // Don't immediately downgrade - let it expire naturally
    console.log("[v0] Subscription cancelled successfully", { userId })
    return true
  } catch (error) {
    console.error("[v0] Error cancelling subscription:", error)
    return false
  }
}