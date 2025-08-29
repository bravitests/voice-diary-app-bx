// Gemini AI integration for transcription and summarization
import { GoogleGenerativeAI } from "@google/generative-ai"

// API key rotation for load balancing
const API_KEYS = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(
  Boolean,
) as string[]

let currentKeyIndex = 0

// Token bucket implementation for rate limiting
class TokenBucket {
  private tokens: number
  private lastRefill: number
  private readonly capacity: number
  private readonly refillRate: number

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity
    this.refillRate = refillRate
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  consume(tokens = 1): boolean {
    this.refill()

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }

    return false
  }

  private refill() {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000
    const tokensToAdd = timePassed * this.refillRate

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now
  }
}

// User-specific rate limiting
const userBuckets = new Map<string, TokenBucket>()

function getUserBucket(userId: string): TokenBucket {
  if (!userBuckets.has(userId)) {
    // 10 requests per minute for free users, 30 for pro users
    userBuckets.set(userId, new TokenBucket(10, 10 / 60))
  }
  return userBuckets.get(userId)!
}

function getNextApiKey(): string {
  if (API_KEYS.length === 0) {
    throw new Error("No Gemini API keys configured")
  }

  const key = API_KEYS[currentKeyIndex]
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length

  return key
}

export async function transcribeAudio(
  audioBlob: Blob,
  userId: string,
  subscriptionTier: "free" | "pro" = "free",
): Promise<{
  transcript: string
  summary: string
  insights: string
  tokensUsed: number
  cost: number
}> {
  // Check rate limiting
  const bucket = getUserBucket(userId)
  if (!bucket.consume()) {
    throw new Error("Rate limit exceeded. Please try again later.")
  }

  try {
    const apiKey = getNextApiKey()
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString("base64")

    const prompt = `
Please analyze this voice diary entry and provide:

1. TRANSCRIPT: A complete, accurate transcription of the audio
2. SUMMARY: A concise 2-3 sentence summary of the main points
3. INSIGHTS: ${
      subscriptionTier === "pro"
        ? "Detailed psychological insights, emotional patterns, and actionable recommendations for personal growth"
        : "Basic emotional tone and key themes identified"
    }

Format your response as JSON with keys: transcript, summary, insights
`

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Audio,
          mimeType: audioBlob.type,
        },
      },
      prompt,
    ])

    const response = await result.response
    const text = response.text()

    // Parse JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(text)
    } catch {
      // Fallback if JSON parsing fails
      parsedResponse = {
        transcript: text,
        summary: "Unable to generate summary",
        insights: "Unable to generate insights",
      }
    }

    // Estimate token usage and cost
    const tokensUsed = Math.ceil(text.length / 4) // Rough estimation
    const cost = tokensUsed * 0.00001 // Rough cost estimation

    console.log("[v0] Gemini AI transcription completed", {
      userId,
      tokensUsed,
      cost,
      subscriptionTier,
    })

    return {
      transcript: parsedResponse.transcript || "Transcription unavailable",
      summary: parsedResponse.summary || "Summary unavailable",
      insights: parsedResponse.insights || "Insights unavailable",
      tokensUsed,
      cost,
    }
  } catch (error) {
    console.error("[v0] Gemini AI transcription error", { userId, error })

    // Fallback response
    return {
      transcript: "Transcription failed. Please try again.",
      summary: "Unable to process audio",
      insights: "Processing unavailable",
      tokensUsed: 0,
      cost: 0,
    }
  }
}

export async function generateChatResponse(
  messages: Array<{ role: string; content: string }>,
  purpose: string,
  userId: string,
  userRecordings: any[] = [],
): Promise<{
  response: string
  tokensUsed: number
  cost: number
}> {
  // Check rate limiting
  const bucket = getUserBucket(userId)
  if (!bucket.consume()) {
    throw new Error("Rate limit exceeded. Please try again later.")
  }

  try {
    const apiKey = getNextApiKey()
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    // Build context from user's recordings
    const recordingContext = userRecordings
      .filter((r) => r.purpose === purpose)
      .slice(0, 5) // Last 5 relevant recordings
      .map((r) => `Entry: ${r.summary || r.transcript?.substring(0, 200)}`)
      .join("\n")

    const systemPrompt = `You are a supportive AI companion for voice journaling focused on ${purpose}. 

Context from user's recent ${purpose} entries:
${recordingContext}

Guidelines:
- Be empathetic and encouraging
- Ask thoughtful follow-up questions
- Provide insights based on patterns in their entries
- Keep responses conversational and supportive
- Focus on personal growth and self-reflection`

    const conversationHistory = messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n")

    const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationHistory}\n\nAssistant:`

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()

    // Estimate token usage and cost
    const tokensUsed = Math.ceil((fullPrompt.length + text.length) / 4)
    const cost = tokensUsed * 0.00001

    console.log("[v0] Gemini AI chat response generated", {
      userId,
      purpose,
      tokensUsed,
      cost,
    })

    return {
      response: text,
      tokensUsed,
      cost,
    }
  } catch (error) {
    console.error("[v0] Gemini AI chat error", { userId, purpose, error })

    return {
      response: "I'm having trouble processing your message right now. Please try again in a moment.",
      tokensUsed: 0,
      cost: 0,
    }
  }
}

// Update user bucket capacity based on subscription tier
export function updateUserRateLimit(userId: string, subscriptionTier: "free" | "pro") {
  const capacity = subscriptionTier === "pro" ? 30 : 10
  const refillRate = capacity / 60 // per second

  userBuckets.set(userId, new TokenBucket(capacity, refillRate))

  console.log("[v0] Updated rate limit for user", { userId, subscriptionTier, capacity })
}
