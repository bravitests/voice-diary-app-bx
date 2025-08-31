import { NextRequest, NextResponse } from 'next/server'

// Simple flag to track if we've attempted initialization
let initAttempted = false

export async function middleware(request: NextRequest) {
  // Only attempt initialization once and only for API routes that need the database
  if (!initAttempted && request.nextUrl.pathname.startsWith('/api/') && 
      !request.nextUrl.pathname.startsWith('/api/init')) {
    
    initAttempted = true
    
    // Trigger database initialization in the background
    // Don't await this to avoid blocking the request
    fetch(new URL('/api/init', request.url), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).catch(error => {
      console.log('Background database initialization failed:', error.message)
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/((?!init).)*', // Match all API routes except /api/init
  ]
}