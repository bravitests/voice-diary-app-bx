"use client"

import { useEffect } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"

export function MiniKitInitializer() {
  const { setFrameReady, isFrameReady } = useMiniKit()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  return null
}