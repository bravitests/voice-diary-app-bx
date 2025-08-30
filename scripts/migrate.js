#!/usr/bin/env node

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Handle case where DATABASE_URL is not available
if (!process.env.DATABASE_URL) {
  console.log('⏭️  DATABASE_URL not available - skipping migration')
  process.exit(0)
}

// Database migration script for Voice Diary App
// This script ensures the database is properly initialized with all required tables and data

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_rate_limiting_tables.sql', 
  '003_purposes_system.sql'
]

async function runMigration(filename) {
  console.log(`📄 Running migration: ${filename}`)
  
  try {
    const filePath = path.join(__dirname, filename)
    const sql = fs.readFileSync(filePath, 'utf8')
    
    await pool.query(sql)
    console.log(`✅ Migration ${filename} completed successfully`)
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error.message)
    throw error
  }
}

async function checkDatabaseConnection() {
  console.log('🔌 Testing database connection...')
  
  try {
    const result = await pool.query('SELECT NOW() as current_time')
    console.log(`✅ Database connected successfully at ${result.rows[0].current_time}`)
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

async function createMigrationTable() {
  console.log('📋 Creating migration tracking table...')
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  
  try {
    await pool.query(createTableSQL)
    console.log('✅ Migration tracking table ready')
  } catch (error) {
    console.error('❌ Failed to create migration table:', error.message)
    throw error
  }
}

async function isMigrationExecuted(filename) {
  try {
    const result = await pool.query(
      'SELECT filename FROM schema_migrations WHERE filename = $1',
      [filename]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message)
    return false
  }
}

async function recordMigration(filename) {
  try {
    await pool.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename]
    )
    console.log(`📝 Recorded migration: ${filename}`)
  } catch (error) {
    console.error('❌ Failed to record migration:', error.message)
    throw error
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting database migrations...')
  
  // Check database connection
  const isConnected = await checkDatabaseConnection()
  if (!isConnected) {
    process.exit(1)
  }
  
  // Create migration tracking table
  await createMigrationTable()
  
  // Run each migration file
  for (const filename of MIGRATION_FILES) {
    const alreadyExecuted = await isMigrationExecuted(filename)
    
    if (alreadyExecuted) {
      console.log(`⏭️  Skipping ${filename} (already executed)`)
      continue
    }
    
    await runMigration(filename)
    await recordMigration(filename)
  }
  
  console.log('🎉 All migrations completed successfully!')
}

async function verifyDatabaseStructure() {
  console.log('🔍 Verifying database structure...')
  
  const requiredTables = [
    'users',
    'recordings', 
    'subscriptions',
    'chat_sessions',
    'chat_messages',
    'api_usage',
    'rate_limits',
    'rate_limit_events',
    'system_metrics',
    'purposes',
    'schema_migrations'
  ]
  
  try {
    for (const tableName of requiredTables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName])
      
      if (result.rows[0].exists) {
        console.log(`✅ Table '${tableName}' exists`)
      } else {
        console.error(`❌ Table '${tableName}' is missing`)
        return false
      }
    }
    
    console.log('✅ All required tables are present')
    return true
  } catch (error) {
    console.error('❌ Error verifying database structure:', error.message)
    return false
  }
}

async function seedDefaultData() {
  console.log('🌱 Checking for default data...')
  
  try {
    // Check if we have any users
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    console.log(`📊 Current user count: ${userCount.rows[0].count}`)
    
    // The purposes system automatically creates default purposes for new users
    // via the database trigger, so no additional seeding needed
    
    console.log('✅ Default data check completed')
  } catch (error) {
    console.error('❌ Error checking default data:', error.message)
    throw error
  }
}

async function main() {
  try {
    // Skip migration if no DATABASE_URL is provided (build time)
    if (!process.env.DATABASE_URL) {
      console.log('⏭️  Skipping database migration (no DATABASE_URL provided)')
      return
    }
    
    console.log('🎯 Voice Diary Database Migration Script')
    console.log('=====================================')
    
    await runAllMigrations()
    
    const structureValid = await verifyDatabaseStructure()
    if (!structureValid) {
      console.error('❌ Database structure verification failed')
      process.exit(1)
    }
    
    await seedDefaultData()
    
    console.log('🎉 Database initialization completed successfully!')
    console.log('✅ Your Voice Diary app is ready to run!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message)
    // Don't exit with error code during build - just log and continue
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      console.log('⚠️  Migration failed during build - this is expected if DATABASE_URL is not set')
      return
    }
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

// Handle script execution
if (require.main === module) {
  main()
}

module.exports = { runAllMigrations, verifyDatabaseStructure }