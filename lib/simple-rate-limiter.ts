// Simplified in-memory rate limiter for better performance
interface RateLimit {
  count: number
  resetTime: number
}

const rateLimits = new Map<string, RateLimit>()

export function checkRateLimit(userId: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = userId
  
  const limit = rateLimits.get(key)
  
  if (!limit || now > limit.resetTime) {
    // Reset or create new limit
    rateLimits.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }
  
  if (limit.count >= maxRequests) {
    return false
  }
  
  limit.count++
  return true
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, limit] of rateLimits.entries()) {
    if (now > limit.resetTime) {
      rateLimits.delete(key)
    }
  }
}, 60000) // Clean up every minute