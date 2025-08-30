// Database initialization utility
// Ensures database is initialized before any database operations

let isInitialized = false
let initPromise: Promise<boolean> | null = null

export async function ensureDatabaseInitialized(): Promise<boolean> {
  if (isInitialized) {
    return true
  }

  if (initPromise) {
    return await initPromise
  }

  initPromise = (async () => {
    try {
      // Call the init API endpoint to initialize the database
      const response = await fetch('/api/init', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const result = await response.json()
        isInitialized = result.initialized
        return result.initialized
      } else {
        console.error('Database initialization API failed:', response.status)
        return false
      }
    } catch (error) {
      console.error('Database initialization error:', error)
      return false
    } finally {
      initPromise = null
    }
  })()

  return await initPromise
}

// Reset initialization state (useful for testing)
export function resetInitializationState() {
  isInitialized = false
  initPromise = null
}