import { Pool, type PoolClient } from "pg"

// Database connection pool
let pool: Pool | null = null
let isInitialized = false

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    console.log("[v0] Initializing Supabase database pool for environment:", process.env.NODE_ENV)

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase.com') ? {
        rejectUnauthorized: false, // Required for Supabase
        checkServerIdentity: () => undefined, // Skip hostname verification
      } : process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
      } : false,
      max: process.env.NODE_ENV === "production" ? 5 : 20, // Fewer connections for serverless
      idleTimeoutMillis: 10000, // Shorter idle timeout for serverless
      connectionTimeoutMillis: 15000, // Even longer connection timeout for Vercel
      allowExitOnIdle: true, // Allow process to exit when idle
    })

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err)
      process.exit(-1)
    })
  }

  return pool
}

async function initializeIfNeeded() {
  const connectionString = process.env.DATABASE_URL
  if (isInitialized || !connectionString) {
    return
  }

  try {
    // Try to run a simple query to check if database is accessible
    const pool = getPool()
    await pool.query('SELECT 1')

    // Check if tables exist, if not run basic setup
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `)

    if (tablesResult.rows[0].count === '0') {
      console.log('[v0] Tables not found, running basic setup...')
      await runBasicSetup(pool)
    } else {
      // Check for migration
      await migrateSchema(pool)
    }

    isInitialized = true
  } catch (error) {
    console.log('Database not yet initialized, will be initialized on first API call')
  }
}

async function migrateSchema(pool: Pool) {
  try {
    // Check if firebase_uid column exists
    const columnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'firebase_uid'
    `)

    if (columnResult.rowCount === 0) {
      console.log('[v0] Migrating schema: Adding firebase_uid and photo_url...')

      // Add new columns
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS photo_url TEXT;
      `)

      // Migrate existing data if any (using wallet_address as temporary firebase_uid if needed, 
      // but better to just leave them null and let users re-sign in)
      // For now, we'll just drop wallet_address constraint if we want to keep data, 
      // but the instruction is to replace.

      // If we want to keep existing users, we might want to map wallet_address to firebase_uid 
      // if they sign in with the same wallet via some other method, but here we are switching auth providers.
      // So existing users might lose access to their old accounts unless we have a way to link them.
      // Given the instruction "replace", we assume fresh start or manual migration isn't priority.

      // Drop wallet_address column
      await pool.query(`
        ALTER TABLE users 
        DROP COLUMN IF EXISTS wallet_address;
      `)

      console.log('[v0] Schema migration completed')
    }

    // Check if payment_tracking table exists and has wallet_address as NOT NULL
    // We want to make it nullable
    const paymentTableResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'payment_tracking'
    `)

    if (paymentTableResult.rows[0].count > 0) {
      const walletColumnResult = await pool.query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'payment_tracking' AND column_name = 'wallet_address'
      `)

      if (walletColumnResult.rowCount !== null && walletColumnResult.rowCount > 0 && walletColumnResult.rows[0].is_nullable === 'NO') {
        console.log('[v0] Migrating payment_tracking: Making wallet_address nullable...')
        await pool.query(`
          ALTER TABLE payment_tracking 
          ALTER COLUMN wallet_address DROP NOT NULL;
        `)
      }
    }
  } catch (error: any) {
    console.error('[v0] Schema migration failed:', error.message)
  }
}

async function runBasicSetup(pool: Pool) {
  try {
    // Create essential tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        photo_url TEXT,
        subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
        subscription_expiry TIMESTAMP WITH TIME ZONE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS purposes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#cdb4db',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recordings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose_id UUID REFERENCES purposes(id) ON DELETE SET NULL,
        audio_url TEXT,
        audio_duration INTEGER,
        transcript TEXT,
        summary TEXT,
        ai_insights TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose_id UUID REFERENCES purposes(id) ON DELETE SET NULL,
        title VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    console.log(' Basic database setup completed')
  } catch (error: any) {
    console.error('Basic setup failed:', error.message)
  }
}

export async function query(text: string, params?: any[]): Promise<any> {
  await initializeIfNeeded()

  const pool = getPool()
  const start = Date.now()

  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start

    // Only log slow queries in production
    if (process.env.NODE_ENV === "development" || duration > 1000) {
      console.log("[v0] Database query executed", { text: text.substring(0, 100), duration, rows: res.rowCount })
    }
    return res
  } catch (error: any) {
    console.error("[v0] Database query error", { text: text.substring(0, 100), error: error.message })
    throw error
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return await pool.connect()
}

// Individual database functions (to avoid minification issues)
export async function createFirebaseUser(firebaseUid: string, email: string | null, name: string | null, photoURL: string | null) {
  const result = await query(
    "INSERT INTO users (firebase_uid, email, name, photo_url) VALUES ($1, $2, $3, $4) RETURNING *",
    [firebaseUid, email, name, photoURL]
  )
  return result.rows[0]
}

export async function getUserByFirebaseUid(firebaseUid: string) {
  const result = await query("SELECT * FROM users WHERE firebase_uid = $1", [firebaseUid])
  return result.rows[0]
}

export async function updateUserProfile(userId: string, name: string, email: string) {
  const result = await query("UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING *", [
    name,
    email,
    userId,
  ])
  return result.rows[0]
}

export async function createRecording(data: { userId: string; purposeId: string; audioUrl: string; transcript: string; summary: string; insights: string; recordedAt: Date; }) {
  const { userId, purposeId, audioUrl, transcript, summary, insights, recordedAt } = data;
  const result = await query(
    "INSERT INTO recordings (user_id, purpose_id, audio_url, transcript, summary, ai_insights, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [userId, purposeId, audioUrl, transcript, summary, insights, recordedAt],
  )
  return result.rows[0]
}

export async function updateRecordingTranscript(recordingId: string, transcript: string, summary: string, insights: string) {
  const result = await query(
    "UPDATE recordings SET transcript = $1, summary = $2, ai_insights = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
    [transcript, summary, insights, recordingId],
  )
  return result.rows[0]
}

export async function getUserRecordings(userId: string, purposeId?: string) {
  let queryText = `
    SELECT r.*, p.name as purpose_name, p.color as purpose_color
    FROM recordings r
    LEFT JOIN purposes p ON r.purpose_id = p.id
    WHERE r.user_id = $1
  `
  const params = [userId]

  if (purposeId && purposeId !== "all") {
    queryText += " AND r.purpose_id = $2"
    params.push(purposeId)
  }

  queryText += " ORDER BY r.created_at DESC"

  const result = await query(queryText, params)
  return result.rows
}

export async function createSubscription(userId: string, tier: string, transactionHash: string, amountPaid: string) {
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1) // 1 month subscription

  const result = await query(
    "INSERT INTO subscriptions (user_id, tier, transaction_hash, amount_paid, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [userId, tier, transactionHash, amountPaid, endDate],
  )
  return result.rows[0]
}

export async function getUserActiveSubscription(userId: string) {
  const result = await query(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2 AND end_date > NOW() ORDER BY created_at DESC LIMIT 1",
    [userId, "active"],
  )
  return result.rows[0]
}

export async function createChatSession(userId: string, purposeId: string, title: string) {
  const result = await query("INSERT INTO chat_sessions (user_id, purpose_id, title) VALUES ($1, $2, $3) RETURNING *", [
    userId,
    purposeId,
    title,
  ])
  return result.rows[0]
}

export async function addChatMessage(sessionId: string, role: string, content: string) {
  const result = await query(
    "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING *",
    [sessionId, role, content],
  )
  return result.rows[0]
}

export async function getChatSession(sessionId: string) {
  const sessionResult = await query("SELECT * FROM chat_sessions WHERE id = $1", [sessionId])

  if (sessionResult.rows.length === 0) return null

  const messagesResult = await query("SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC", [
    sessionId,
  ])

  return {
    ...sessionResult.rows[0],
    messages: messagesResult.rows,
  }
}

export async function getLatestChatSession(userId: string, purposeId: string) {
  const sessionResult = await query(
    "SELECT * FROM chat_sessions WHERE user_id = $1 AND purpose_id = $2 ORDER BY created_at DESC LIMIT 1",
    [userId, purposeId]
  )

  if (sessionResult.rows.length === 0) return null

  const sessionId = sessionResult.rows[0].id
  const messagesResult = await query("SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC", [
    sessionId,
  ])

  return {
    ...sessionResult.rows[0],
    messages: messagesResult.rows,
  }
}

export async function trackApiUsage(userId: string, apiType: string, tokensUsed: number, cost: number) {
  const result = await query(
    "INSERT INTO api_usage (user_id, api_type, tokens_used, cost) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, apiType, tokensUsed, cost],
  )
  return result.rows[0]
}

export async function getUserApiUsage(userId: string, startDate: Date, endDate: Date) {
  const result = await query(
    "SELECT api_type, SUM(tokens_used) as total_tokens, SUM(cost) as total_cost FROM api_usage WHERE user_id = $1 AND created_at BETWEEN $2 AND $3 GROUP BY api_type",
    [userId, startDate, endDate],
  )
  return result.rows
}

export async function getUserPurposes(userId: string) {
  const result = await query(`
    SELECT p.*, COUNT(r.id) as recording_count
    FROM purposes p
    LEFT JOIN recordings r ON r.purpose_id = p.id
    WHERE p.user_id = $1
    GROUP BY p.id
    ORDER BY p.is_default DESC, p.created_at ASC
  `, [userId])
  return result.rows
}

export async function createPurpose(userId: string, name: string, description?: string, isDefault: boolean = false, color: string = '#cdb4db') {
  const result = await query(`
    INSERT INTO purposes (user_id, name, description, is_default, color)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [userId, name, description, isDefault, color])
  return result.rows[0]
}

export async function createDefaultPurpose(userId: string) {
  // Check if user already has any purposes
  const existingPurposes = await query("SELECT COUNT(*) as count FROM purposes WHERE user_id = $1", [userId])

  if (existingPurposes.rows[0].count > 0) {
    console.log("[v0] User already has purposes, skipping default creation")
    return null
  }

  // Create default purpose only if user has none
  const result = await query(`
    INSERT INTO purposes (user_id, name, description, is_default, color)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    userId,
    'Personal Growth',
    'Daily reflections on personal development and self-improvement',
    true,
    '#cdb4db'
  ])

  console.log("[v0] Created default purpose for user:", userId)
  return result.rows[0]
}

// Legacy db object for backward compatibility (but prefer individual functions)
export const db = {
  // User operations
  async createUser(firebaseUid: string, email: string | null, name: string | null, photoURL: string | null) {
    return createFirebaseUser(firebaseUid, email, name, photoURL)
  },

  async getUserByWallet(firebaseUid: string) {
    return getUserByFirebaseUid(firebaseUid)
  },

  async updateUserProfile(userId: string, name: string, email: string) {
    const result = await query("UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING *", [
      name,
      email,
      userId,
    ])
    return result.rows[0]
  },

  // Recording operations
  async createRecording(data: { userId: string; purposeId: string; audioUrl: string; transcript: string; summary: string; insights: string; recordedAt: Date; }) {
    const { userId, purposeId, audioUrl, transcript, summary, insights, recordedAt } = data;
    const result = await query(
      "INSERT INTO recordings (user_id, purpose_id, audio_url, transcript, summary, ai_insights, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [userId, purposeId, audioUrl, transcript, summary, insights, recordedAt],
    )
    return result.rows[0]
  },

  async updateRecordingTranscript(recordingId: string, transcript: string, summary: string, insights: string) {
    const result = await query(
      "UPDATE recordings SET transcript = $1, summary = $2, ai_insights = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
      [transcript, summary, insights, recordingId],
    )
    return result.rows[0]
  },

  async getUserRecordings(userId: string, purposeId?: string) {
    let queryText = `
      SELECT r.*, p.name as purpose_name, p.color as purpose_color
      FROM recordings r
      LEFT JOIN purposes p ON r.purpose_id = p.id
      WHERE r.user_id = $1
    `
    const params = [userId]

    if (purposeId && purposeId !== "all") {
      queryText += " AND r.purpose_id = $2"
      params.push(purposeId)
    }

    queryText += " ORDER BY r.created_at DESC"

    const result = await query(queryText, params)
    return result.rows
  },

  // Subscription operations
  async createSubscription(userId: string, tier: string, transactionHash: string, amountPaid: string) {
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1) // 1 month subscription

    const result = await query(
      "INSERT INTO subscriptions (user_id, tier, transaction_hash, amount_paid, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, tier, transactionHash, amountPaid, endDate],
    )
    return result.rows[0]
  },

  async getUserActiveSubscription(userId: string) {
    const result = await query(
      "SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2 AND end_date > NOW() ORDER BY created_at DESC LIMIT 1",
      [userId, "active"],
    )
    return result.rows[0]
  },

  // Chat operations
  async createChatSession(userId: string, purposeId: string, title: string) {
    const result = await query("INSERT INTO chat_sessions (user_id, purpose_id, title) VALUES ($1, $2, $3) RETURNING *", [
      userId,
      purposeId,
      title,
    ])
    return result.rows[0]
  },

  async addChatMessage(sessionId: string, role: string, content: string) {
    const result = await query(
      "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING *",
      [sessionId, role, content],
    )
    return result.rows[0]
  },

  async getChatSession(sessionId: string) {
    const sessionResult = await query("SELECT * FROM chat_sessions WHERE id = $1", [sessionId])

    if (sessionResult.rows.length === 0) return null

    const messagesResult = await query("SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC", [
      sessionId,
    ])

    return {
      ...sessionResult.rows[0],
      messages: messagesResult.rows,
    }
  },

  async getLatestChatSession(userId: string, purposeId: string) {
    const sessionResult = await query(
      "SELECT * FROM chat_sessions WHERE user_id = $1 AND purpose_id = $2 ORDER BY created_at DESC LIMIT 1",
      [userId, purposeId]
    )

    if (sessionResult.rows.length === 0) return null

    const sessionId = sessionResult.rows[0].id
    const messagesResult = await query("SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC", [
      sessionId,
    ])

    return {
      ...sessionResult.rows[0],
      messages: messagesResult.rows,
    }
  },

  // API usage tracking
  async trackApiUsage(userId: string, apiType: string, tokensUsed: number, cost: number) {
    const result = await query(
      "INSERT INTO api_usage (user_id, api_type, tokens_used, cost) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, apiType, tokensUsed, cost],
    )
    return result.rows[0]
  },

  async getUserApiUsage(userId: string, startDate: Date, endDate: Date) {
    const result = await query(
      "SELECT api_type, SUM(tokens_used) as total_tokens, SUM(cost) as total_cost FROM api_usage WHERE user_id = $1 AND created_at BETWEEN $2 AND $3 GROUP BY api_type",
      [userId, startDate, endDate],
    )
    return result.rows
  },

  // Purpose operations
  async getUserPurposes(userId: string) {
    const result = await query(`
      SELECT p.*, COUNT(r.id) as recording_count
      FROM purposes p
      LEFT JOIN recordings r ON r.purpose_id = p.id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.is_default DESC, p.created_at ASC
    `, [userId])
    return result.rows
  },

  async createPurpose(userId: string, name: string, description?: string, isDefault: boolean = false, color: string = '#cdb4db') {
    const result = await query(`
      INSERT INTO purposes (user_id, name, description, is_default, color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, name, description, isDefault, color])
    return result.rows[0]
  },

  async createDefaultPurpose(userId: string) {
    // Check if user already has any purposes
    const existingPurposes = await query("SELECT COUNT(*) as count FROM purposes WHERE user_id = $1", [userId])

    if (existingPurposes.rows[0].count > 0) {
      console.log("[v0] User already has purposes, skipping default creation")
      return null
    }

    // Create default purpose only if user has none
    const result = await query(`
      INSERT INTO purposes (user_id, name, description, is_default, color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      userId,
      'Personal Growth',
      'Daily reflections on personal development and self-improvement',
      true,
      '#cdb4db'
    ])

    console.log("[v0] Created default purpose for user:", userId)
    return result.rows[0]
  },

  // Expose query for direct access
  async query(text: string, params?: any[]) {
    return query(text, params)
  }
}
