import { NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET() {
  try {
    const start = Date.now()

    // Simple database connectivity test
    const result = await query('SELECT 1 as health_check')

    const duration = Date.now() - start

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      result: result.rows[0]
    })
  } catch (error) {
    console.error("[v0] Health check failed:", error)

    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json({
      status: "unhealthy",
      database: "disconnected",
      error: errorMessage,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 503 })
  }
}