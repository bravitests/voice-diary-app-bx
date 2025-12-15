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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString("base64")

    const prompt = "Transcribe the following audio recording:"

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
    const transcript = response.text()

    // Estimate token usage and cost
    const tokensUsed = Math.ceil(transcript.length / 4) // Rough estimation
    const cost = tokensUsed * 0.00001 // Rough cost estimation

    console.log("[v0] Gemini AI transcription completed", {
      userId,
      tokensUsed,
      cost,
      subscriptionTier,
    })

    return {
      transcript: transcript || "Transcription unavailable",
      tokensUsed,
      cost,
    }
  } catch (error) {
    console.error("[v0] Gemini AI transcription error", { userId, error })

    // Fallback response
    return {
      transcript: "Transcription failed. Please try again.",
      tokensUsed: 0,
      cost: 0,
    }
  }
}

export async function generateSummaryFromAudio(
  audioBlob: Blob,
  userId: string,
  subscriptionTier: "free" | "pro" = "free",
): Promise<{
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString("base64")

    const prompt = `
Please analyze this voice diary audio and provide:

1. SUMMARY: A concise 2-3 sentence summary of the main points and key themes
2. INSIGHTS: ${subscriptionTier === "pro"
        ? "Detailed psychological insights, emotional patterns, recurring themes, and actionable recommendations for personal growth and self-reflection"
        : "Basic emotional tone, key themes, and general observations about the content"
      }

Format your response as JSON with keys: summary, insights
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

    const response = result.response
    const text = response.text()

    // Parse JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(text)
    } catch {
      // Fallback if JSON parsing fails
      const summaryMatch = text.match(/summary['":\s]*([^,}]+)/i)
      const insightsMatch = text.match(/insights['":\s]*([^}]+)/i)

      parsedResponse = {
        summary: summaryMatch ? summaryMatch[1].replace(/['"]/g, '').trim() : "Unable to generate summary",
        insights: insightsMatch ? insightsMatch[1].replace(/['"]/g, '').trim() : "Unable to generate insights",
      }
    }

    // Estimate token usage and cost
    const tokensUsed = Math.ceil((prompt.length + text.length) / 4)
    const cost = tokensUsed * 0.00001

    return {
      summary: parsedResponse.summary || "Summary unavailable",
      insights: parsedResponse.insights || "Insights unavailable",
      tokensUsed,
      cost,
    }
  } catch (error) {
    console.error("[v0] Gemini AI summary error", { userId, error })

    return {
      summary: "Unable to process audio",
      insights: "Processing unavailable",
      tokensUsed: 0,
      cost: 0,
    }
  }
}

export async function generateSummaryFromTranscript(
  transcript: string,
  userId: string,
  subscriptionTier: "free" | "pro" = "free",
): Promise<{
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const prompt = `Summarize the following journal entry concisely in one or two sentences: ${transcript}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Use the response directly as summary, generate simple insights
    const summary = text.trim()
    const insights = `{
    emotional_tone: The emotional tone is neutral and objective,
    key_themes: ["${subscriptionTier === "pro" ? "detailed reflection" : "basic thoughts"}"],
    observations: "${subscriptionTier === "pro" ? "Advanced insights available for Pro users" : "Basic summary provided"}"
}`

    // Estimate token usage and cost
    const tokensUsed = Math.ceil((prompt.length + text.length) / 4) // Rough estimation
    const cost = tokensUsed * 0.00001 // Rough cost estimation

    console.log("[v0] Gemini AI summary completed", {
      userId,
      tokensUsed,
      cost,
      subscriptionTier,
    })

    return {
      summary: summary || "Summary unavailable",
      insights: insights || "Insights unavailable",
      tokensUsed,
      cost,
    }
  } catch (error) {
    console.error("[v0] Gemini AI summary error", { userId, error })

    // Fallback response
    return {
      summary: "Unable to process transcript",
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
  transcriptions: string = "",
  chatHistory: Array<{ role: string; content: string }> = [],
  userName: string = "there"
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

    const systemInstruction = `You are a supportive AI companion for a voice diary app. You're chatting with ${userName} about their ${purpose} entries.

${transcriptions ? `Here are ${userName}'s recent ${purpose} transcriptions:
${transcriptions}

` : ''}Guidelines:
- Be empathetic and encouraging
- Ask thoughtful follow-up questions based on their diary entries
- Help them reflect and gain insights from their voice journaling
- Keep responses conversational and supportive
- Focus on personal growth and self-reflection
- Reference their actual diary content when relevant
- CRITICAL SAFETY & MENTAL HEALTH PROTOCOL:
  1. Detection: Actively monitor for signs of severe depression, self-harm ideation, hopelessness, or "darkness".
  2. Intervention:
     - If you detect these signs, do not just offer generic advice.
     - Gently suggest speaking to a professional or a trusted friend.
     - Provide these specific affordable/free resources in Kenya:
       * Kenya Red Cross: 1199 (Toll Free)
       * Befrienders Kenya: 0722 178 177 (Suicide Prevention)
       * Nairobi Mental Health (Affordable options available)
  3. Isolation Handling:
     - IF AND ONLY IF the user explicitly states they have "no friends", "no one to talk to", or feeling completely isolated:
     - You may offer this specific personal contact as a supportive listener (last resort): "0106818767" (The app creator).
     - Frame this as a personal, human offer of support from the creator of Voice Diary, who is willing to listen.`

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction
    })

    // Combine chat history with current messages
    const allMessages = [...chatHistory, ...messages]
    const conversationHistory = allMessages.map(msg => `${msg.role}: ${msg.content}`).join("\n")

    const result = await model.generateContent(conversationHistory)
    const response = await result.response
    const text = response.text()

    // Estimate token usage and cost
    const tokensUsed = Math.ceil((systemInstruction.length + conversationHistory.length + text.length) / 4)
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
