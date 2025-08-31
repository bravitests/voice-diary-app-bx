import { NextResponse } from "next/server"
import { runAllMigrations, verifyDatabaseStructure } from "@/lib/migrate"

// API endpoint to initialize database on first request
// This ensures database is set up when the app first starts in production

let isInitialized = false
let initializationPromise: Promise<boolean> | null = null

async function initializeDatabase(): Promise<boolean> {
  if (isInitialized) {
    return true
  }

  if (initializationPromise) {
    return await initializationPromise
  }

  initializationPromise = (async () => {
    try {
      console.log('🚀 Initializing database on first request...')
      
      if (!process.env.DATABASE_URL) {
        console.log('⚠️  No DATABASE_URL provided - skipping initialization')
        return false
      }

      await runAllMigrations()
      const isValid = await verifyDatabaseStructure()
      
      if (isValid) {
        isInitialized = true
        console.log('✅ Database initialized successfully')
        return true
      } else {
        console.log('❌ Database initialization failed')
        return false
      }
    } catch (error) {
      console.error('💥 Database initialization error:', error)
      return false
    } finally {
      initializationPromise = null
    }
  })()

  return await initializationPromise
}

export async function GET() {
  try {
    const success = await initializeDatabase()
    
    return NextResponse.json({
      initialized: success,
      timestamp: new Date().toISOString(),
      message: success ? 'Database initialized successfully' : 'Database initialization failed'
    })
  } catch (error) {
    console.error('Init API error:', error)
    return NextResponse.json(
      { 
        initialized: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  // Force re-initialization
  isInitialized = false
  return GET()
}

// Export the initialization function for use in other parts of the app
export { initializeDatabase }