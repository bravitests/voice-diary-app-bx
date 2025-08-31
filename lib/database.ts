import { Pool, type PoolClient } from "pg"

// Database connection pool
let pool: Pool | null = null
let isInitialized = false

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    console.log("[v0] Initializing database pool for environment:", process.env.NODE_ENV)
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: process.env.NODE_ENV === "production" ? 5 : 20, // Fewer connections for serverless
      idleTimeoutMillis: 10000, // Shorter idle timeout for serverless
      connectionTimeoutMillis: 15000, // Even longer connection timeout for Vercel
      allowExitOnIdle: true, // Allow process to exit when idle
      // Add retry logic for connection failures
      retryDelayMs: 1000,
    })

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err)
      process.exit(-1)
    })
  }

  return pool
}

async function initializeIfNeeded() {
  if (isInitialized || !process.env.DATABASE_URL) {
    return
  }

  try {
    // Try to run a simple query to check if database is accessible
    const pool = getPool()
    await pool.query('SELECT 1')
    isInitialized = true
  } catch (error) {
    console.log('Database not yet initialized, will be initialized on first API call')
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
  } catch (error) {
    console.error("[v0] Database query error", { text: text.substring(0, 100), error: error.message })
    throw error
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return await pool.connect()
}

// Database helper functions
export const db = {
  // User operations
  async createUser(walletAddress: string) {
    const result = await query("INSERT INTO users (wallet_address) VALUES ($1) RETURNING *", [walletAddress])
    return result.rows[0]
  },

  async getUserByWallet(walletAddress: string) {
    const result = await query("SELECT * FROM users WHERE wallet_address = $1", [walletAddress])
    return result.rows[0]
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
  async createRecording(userId: string, purposeId: string, audioUrl: string, duration: number) {
    const result = await query(
      "INSERT INTO recordings (user_id, purpose_id, audio_url, audio_duration) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, purposeId, audioUrl, duration],
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
}
