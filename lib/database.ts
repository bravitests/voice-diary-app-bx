import { Pool, type PoolClient } from "pg"

// Database connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    })

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err)
      process.exit(-1)
    })
  }

  return pool
}

export async function query(text: string, params?: any[]): Promise<any> {
  const pool = getPool()
  const start = Date.now()

  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("[v0] Database query executed", { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error("[v0] Database query error", { text, error })
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
  async createRecording(userId: string, purpose: string, audioUrl: string, duration: number) {
    const result = await query(
      "INSERT INTO recordings (user_id, purpose, audio_url, audio_duration) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, purpose, audioUrl, duration],
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

  async getUserRecordings(userId: string, purpose?: string) {
    let queryText = "SELECT * FROM recordings WHERE user_id = $1"
    const params = [userId]

    if (purpose && purpose !== "all") {
      queryText += " AND purpose = $2"
      params.push(purpose)
    }

    queryText += " ORDER BY created_at DESC"

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
  async createChatSession(userId: string, purpose: string, title: string) {
    const result = await query("INSERT INTO chat_sessions (user_id, purpose, title) VALUES ($1, $2, $3) RETURNING *", [
      userId,
      purpose,
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
}
