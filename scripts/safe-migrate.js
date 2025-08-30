#!/usr/bin/env node

// Safe migration script that only runs when DATABASE_URL is available
// This prevents build failures when environment variables aren't set during build time

const { runAllMigrations, verifyDatabaseStructure } = require('./migrate.js')

async function safeMigrate() {
  // Only run if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.log('⏭️  Skipping database migration (DATABASE_URL not available)')
    return true
  }

  try {
    console.log('🔄 Running safe database migration...')
    await runAllMigrations()
    
    const isValid = await verifyDatabaseStructure()
    if (isValid) {
      console.log('✅ Database migration completed successfully')
      return true
    } else {
      console.log('⚠️  Database structure verification failed')
      return false
    }
  } catch (error) {
    console.log('⚠️  Migration failed:', error.message)
    return false
  }
}

// Handle script execution
if (require.main === module) {
  safeMigrate().then(success => {
    // Don't exit with error code - just log the result
    if (success) {
      console.log('✅ Safe migration completed')
    } else {
      console.log('⚠️  Safe migration had issues - check logs above')
    }
  })
}

module.exports = { safeMigrate }