// Enhanced rate limiting and concurrency management system
import { db } from "@/lib/database"

// Request queue for handling high traffic
interface QueuedRequest {
  id: string
  userId: string
  type: "transcription" | "chat"
  priority: number
  timestamp: number
  resolve: (value: any) => void
  reject: (error: any) => void
  data: any
}

class RequestQueue {
  private queue: QueuedRequest[] = []
  private processing = false
  private maxConcurrent = 10
  private currentProcessing = 0

  async addRequest(userId: string, type: "transcription" | "chat", data: any, priority = 1): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${Date.now()}-${Math.random()}`,
        userId,
        type,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
        data,
      }

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex((r) => r.priority < priority)
      if (insertIndex === -1) {
        this.queue.push(request)
      } else {
        this.queue.splice(insertIndex, 0, request)
      }

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.currentProcessing >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0 && this.currentProcessing < this.maxConcurrent) {
      const request = this.queue.shift()!
      this.currentProcessing++

      // Process request asynchronously
      this.processRequest(request).finally(() => {
        this.currentProcessing--
        this.processQueue()
      })
    }

    this.processing = false
  }

  private async processRequest(request: QueuedRequest) {
    try {
      let result
      if (request.type === "transcription") {
        const { transcribeAudio } = await import("@/lib/gemini-ai")
        result = await transcribeAudio(request.data.audioBlob, request.userId, request.data.subscriptionTier)
      } else if (request.type === "chat") {
        const { generateChatResponse } = await import("@/lib/gemini-ai")
        result = await generateChatResponse(
          request.data.messages,
          request.data.purpose,
          request.userId,
          request.data.userRecordings,
        )
      }

      request.resolve(result)
    } catch (error) {
      request.reject(error)
    }
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.currentProcessing,
      maxConcurrent: this.maxConcurrent,
    }
  }
}

// Global request queue instance
export const requestQueue = new RequestQueue()

// Enhanced token bucket with distributed rate limiting
export class DistributedTokenBucket {
  private userId: string
  private capacity: number
  private refillRate: number
  private lastRefill: number
  private tokens: number

  constructor(userId: string, capacity: number, refillRate: number) {
    this.userId = userId
    this.capacity = capacity
    this.refillRate = refillRate
    this.lastRefill = Date.now()
    this.tokens = capacity
  }

  async consume(tokens = 1): Promise<boolean> {
    await this.syncWithDatabase()
    this.refill()

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      await this.updateDatabase()
      return true
    }

    return false
  }

  private refill() {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000
    const tokensToAdd = timePassed * this.refillRate

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  private async syncWithDatabase() {
    try {
      const result = await db.query(
        "SELECT tokens, last_refill FROM rate_limits WHERE user_id = $1 AND bucket_type = $2",
        [this.userId, "api_requests"],
      )

      if (result.rows.length > 0) {
        const { tokens, last_refill } = result.rows[0]
        this.tokens = tokens
        this.lastRefill = new Date(last_refill).getTime()
      }
    } catch (error) {
      console.error("[v0] Error syncing rate limit from database:", error)
    }
  }

  private async updateDatabase() {
    try {
      await db.query(
        `INSERT INTO rate_limits (user_id, bucket_type, tokens, last_refill, capacity, refill_rate) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, bucket_type) 
         DO UPDATE SET tokens = $3, last_refill = $4`,
        [this.userId, "api_requests", this.tokens, new Date(this.lastRefill), this.capacity, this.refillRate],
      )
    } catch (error) {
      console.error("[v0] Error updating rate limit in database:", error)
    }
  }
}

// Circuit breaker for API resilience
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: "closed" | "open" | "half-open" = "closed"
  private readonly failureThreshold = 5
  private readonly recoveryTimeout = 60000 // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "half-open"
      } else {
        throw new Error("Circuit breaker is open")
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = "closed"
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = "open"
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    }
  }
}

// Global circuit breakers for different services
export const geminiCircuitBreaker = new CircuitBreaker()

// Rate limiting middleware
export async function rateLimitMiddleware(userId: string, requestType: string): Promise<boolean> {
  try {
    // Get user subscription for rate limit configuration
    const subscription = await db.query("SELECT subscription_tier FROM users WHERE id = $1", [userId])

    if (subscription.rows.length === 0) {
      return false
    }

    const tier = subscription.rows[0].subscription_tier
    const capacity = tier === "pro" ? 100 : 30 // requests per minute
    const refillRate = capacity / 60 // per second

    const bucket = new DistributedTokenBucket(userId, capacity, refillRate)
    const allowed = await bucket.consume()

    // Log rate limiting events
    if (!allowed) {
      await db.query(
        "INSERT INTO rate_limit_events (user_id, request_type, blocked, created_at) VALUES ($1, $2, $3, NOW())",
        [userId, requestType, true],
      )

      console.log("[v0] Rate limit exceeded", { userId, requestType, tier })
    }

    return allowed
  } catch (error) {
    console.error("[v0] Rate limiting error:", error)
    return true // Allow on error to avoid blocking users
  }
}

// System health monitoring
export class SystemMonitor {
  private static instance: SystemMonitor
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    activeConnections: 0,
    queueLength: 0,
  }

  static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor()
    }
    return SystemMonitor.instance
  }

  recordRequest(success: boolean, responseTime: number) {
    this.metrics.totalRequests++
    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
    }

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests
  }

  updateActiveConnections(count: number) {
    this.metrics.activeConnections = count
  }

  updateQueueLength(length: number) {
    this.metrics.queueLength = length
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 ? this.metrics.successfulRequests / this.metrics.totalRequests : 0,
      errorRate: this.metrics.totalRequests > 0 ? this.metrics.failedRequests / this.metrics.totalRequests : 0,
      timestamp: Date.now(),
    }
  }

  async saveMetricsToDatabase() {
    try {
      const metrics = this.getMetrics()
      await db.query(
        `INSERT INTO system_metrics 
         (total_requests, successful_requests, failed_requests, average_response_time, 
          active_connections, queue_length, success_rate, error_rate, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          metrics.totalRequests,
          metrics.successfulRequests,
          metrics.failedRequests,
          metrics.averageResponseTime,
          metrics.activeConnections,
          metrics.queueLength,
          metrics.successRate,
          metrics.errorRate,
        ],
      )
    } catch (error) {
      console.error("[v0] Error saving metrics to database:", error)
    }
  }
}

export const systemMonitor = SystemMonitor.getInstance()

// Auto-scaling logic based on queue length and response times
export function checkAutoScaling() {
  const metrics = systemMonitor.getMetrics()
  const queueStatus = requestQueue.getQueueStatus()

  // Scale up if queue is getting long or response times are high
  if (queueStatus.queueLength > 50 || metrics.averageResponseTime > 5000) {
    console.log("[v0] High load detected, consider scaling up", {
      queueLength: queueStatus.queueLength,
      averageResponseTime: metrics.averageResponseTime,
    })
    // In production, this would trigger auto-scaling
  }

  // Scale down if system is underutilized
  if (queueStatus.queueLength === 0 && metrics.averageResponseTime < 1000) {
    console.log("[v0] Low load detected, consider scaling down")
  }
}

// Periodic cleanup and maintenance
setInterval(() => {
  systemMonitor.saveMetricsToDatabase()
  checkAutoScaling()
}, 60000) // Every minute
