import { NextRequest, NextResponse } from 'next/server'

// Simple flag to track if we've attempted initialization
let initAttempted = false

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/profile',
  '/billing',
  '/chat',
  '/entries'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('session')

  // 1. Auth Check
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 2. Database Initialization (Keep existing logic)
  // Only attempt initialization once and only for API routes that need the database
  if (!initAttempted && pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/init')) {

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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}