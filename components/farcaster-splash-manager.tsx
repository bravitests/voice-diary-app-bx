'use client'

import { useEffect, useState } from 'react'
import { hideSplashScreen, isFarcasterMiniApp } from '@/lib/farcaster'

export function FarcasterSplashManager() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isFarcasterMiniApp()) return

    // Wait for the DOM to be fully loaded and interface to be ready
    const timer = setTimeout(() => {
      hideSplashScreen()
      setIsReady(true)
    }, 100) // Small delay to ensure content is rendered

    return () => clearTimeout(timer)
  }, [])

  return null
}