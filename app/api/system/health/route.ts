import { NextResponse } from "next/server"
import { systemMonitor, requestQueue, geminiCircuitBreaker } from "@/lib/rate-limiter"
import { getPool } from "@/lib/database"

export async function GET() {
  try {
    const metrics = systemMonitor.getMetrics()
    const queueStatus = requestQueue.getQueueStatus()
    const circuitBreakerState = geminiCircuitBreaker.getState()

    // Check database health
    const pool = getPool()
    const dbStart = Date.now()
    await pool.query("SELECT 1")
    const dbResponseTime = Date.now() - dbStart

    const health = {
      status: "healthy",
      timestamp: Date.now(),
      metrics,
      queue: queueStatus,
      circuitBreaker: circuitBreakerState,
      database: {
        connected: true,
        responseTime: dbResponseTime,
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }

    // Determine overall health status
    if (
      metrics.errorRate > 0.1 || // More than 10% error rate
      queueStatus.queueLength > 100 || // Queue too long
      circuitBreakerState.state === "open" || // Circuit breaker open
      dbResponseTime > 1000 // Database slow
    ) {
      health.status = "degraded"
    }

    return NextResponse.json(health)
  } catch (error) {
    console.error("[v0] Health check error:", error)

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    )
  }
}
