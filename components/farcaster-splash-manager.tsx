'use client'

import { useEffect } from 'react'
import { hideSplashScreen, isFarcasterMiniApp } from '@/lib/farcaster'

export function FarcasterSplashManager() {
  useEffect(() => {
    if (isFarcasterMiniApp()) {
      hideSplashScreen()
    }
  }, [])

  return null
}