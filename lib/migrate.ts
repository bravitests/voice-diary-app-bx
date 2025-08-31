// Database migration utilities for Voice Diary App
// This is a TypeScript version that can be safely imported in API routes

import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_rate_limiting_tables.sql', 
  '003_purposes_system.sql'
]

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}

async function runMigration(filename: string) {
  console.log(`📄 Running migration: ${filename}`)
  
  try {
    const filePath = path.join(process.cwd(), 'scripts', filename)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Migration file ${filename} not found, skipping`)
      return
    }
    
    const sql = fs.readFileSync(filePath, 'utf8')
    const pool = getPool()
    
    await pool.query(sql)
    console.log(`✅ Migration ${filename} completed successfully`)
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error)
    throw error
  }
}

async function checkDatabaseConnection(): Promise<boolean> {
  console.log('🔌 Testing database connection...')
  
  try {
    const pool = getPool()
    const result = await pool.query('SELECT NOW() as current_time')
    console.log(`✅ Database connected successfully at ${result.rows[0].current_time}`)
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
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
    const pool = getPool()
    await pool.query(createTableSQL)
    console.log('✅ Migration tracking table ready')
  } catch (error) {
    console.error('❌ Failed to create migration table:', error)
    throw error
  }
}

async function isMigrationExecuted(filename: string): Promise<boolean> {
  try {
    const pool = getPool()
    const result = await pool.query(
      'SELECT filename FROM schema_migrations WHERE filename = $1',
      [filename]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('❌ Error checking migration status:', error)
    return false
  }
}

async function recordMigration(filename: string) {
  try {
    const pool = getPool()
    await pool.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename]
    )
    console.log(`📝 Recorded migration: ${filename}`)
  } catch (error) {
    console.error('❌ Failed to record migration:', error)
    throw error
  }
}

export async function runAllMigrations(): Promise<void> {
  console.log('🚀 Starting database migrations...')
  
  // Skip if no DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.log('⏭️  Skipping migrations (no DATABASE_URL)')
    return
  }
  
  // Check database connection
  const isConnected = await checkDatabaseConnection()
  if (!isConnected) {
    throw new Error('Database connection failed')
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

export async function verifyDatabaseStructure(): Promise<boolean> {
  console.log('🔍 Verifying database structure...')
  
  if (!process.env.DATABASE_URL) {
    console.log('⏭️  Skipping verification (no DATABASE_URL)')
    return true
  }
  
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
    const pool = getPool()
    
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
    console.error('❌ Error verifying database structure:', error)
    return false
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}