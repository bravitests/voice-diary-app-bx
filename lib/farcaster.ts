export const hideSplashScreen = async (disableNativeGestures = false) => {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk')
    await sdk.actions.ready({ disableNativeGestures })
    console.log('Farcaster splash screen hidden successfully')
  } catch (error) {
    console.error('Failed to hide splash screen:', error)
  }
}

export const isFarcasterMiniApp = () => {
  if (typeof window === 'undefined') return false
  
  // Check for Farcaster miniapp environment
  return (
    window.parent !== window || 
    window.location.href.includes('farcaster.xyz') ||
    window.navigator.userAgent.includes('Farcaster')
  )
}