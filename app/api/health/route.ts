import { NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET() {
  try {
    const start = Date.now()
    
    // Simple database connectivity test
    const result = await db.query('SELECT 1 as health_check')
    
    const duration = Date.now() - start
    
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    })
  } catch (error) {
    console.error("[v0] Health check failed:", error)
    
    return NextResponse.json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 503 })
  }
}