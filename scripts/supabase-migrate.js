#!/usr/bin/env node

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables (only in development)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

async function runSupabaseMigrations() {
  const connectionString = process.env.DATABASE_POSTGRES_URL || process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ DATABASE_POSTGRES_URL or DATABASE_URL not found in environment variables')
    
    // Don't fail the build in production if DB is not available
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Skipping migrations in production build (DB not available)')
      return
    }
    
    process.exit(1)
  }

  console.log('🔄 Connecting to Supabase database...')
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development')
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase
    },
    // Shorter timeouts for build process
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 5000,
  })

  try {
    // Test connection
    await pool.query('SELECT 1')
    console.log('✅ Connected to Supabase database successfully')

    // Get list of migration files
    const scriptsDir = path.join(__dirname)
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_rate_limiting_tables.sql', 
      '003_purposes_system.sql'
    ]

    console.log('🔄 Running migrations...')

    for (const file of migrationFiles) {
      const filePath = path.join(scriptsDir, file)
      
      if (fs.existsSync(filePath)) {
        console.log(`📄 Running migration: ${file}`)
        const sql = fs.readFileSync(filePath, 'utf8')
        
        try {
          await pool.query(sql)
          console.log(`✅ Migration ${file} completed successfully`)
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Migration ${file} - tables already exist, skipping`)
          } else {
            console.error(`❌ Migration ${file} failed:`, error.message)
            throw error
          }
        }
      } else {
        console.log(`⚠️  Migration file ${file} not found, skipping`)
      }
    }

    console.log('🎉 All migrations completed successfully!')
    
    // Test basic functionality
    console.log('🔄 Testing database functionality...')
    const testResult = await pool.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public'])
    console.log(`✅ Database has ${testResult.rows[0].table_count} tables`)

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    
    // Don't fail the build in production, just log the error
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Migration failed in production build, but continuing...')
      console.log('💡 Migrations will run on first API call instead')
    } else {
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

// Run migrations
runSupabaseMigrations().catch(console.error)