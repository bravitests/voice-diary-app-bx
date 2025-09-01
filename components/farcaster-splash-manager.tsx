'use client'

import { useEffect } from 'react'
import { hideSplashScreen, isFarcasterMiniApp } from '@/lib/farcaster'

export function FarcasterSplashManager() {
  useEffect(() => {
    if (isFarcasterMiniApp()) {
      // Hide splash screen once the app is ready
      const timer = setTimeout(() => {
        hideSplashScreen()
      }, 1000) // Adjust timing based on your app's loading needs

      return () => clearTimeout(timer)
    }
  }, [])

  return null
}