export const hideSplashScreen = async (disableNativeGestures = false) => {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk')
    await sdk.actions.ready({ disableNativeGestures })
  } catch (error) {
    console.error('Failed to hide splash screen:', error)
  }
}

export const isFarcasterMiniApp = () => {
  if (typeof window === 'undefined') return false
  
  return window.parent !== window
}