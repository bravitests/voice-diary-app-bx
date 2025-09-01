import { sdk } from '@farcaster/miniapp-sdk'

export const hideSplashScreen = async (disableNativeGestures = false) => {
  try {
    await sdk.actions.ready({ disableNativeGestures })
  } catch (error) {
    console.error('Failed to hide splash screen:', error)
  }
}

export const isFarcasterMiniApp = () => {
  if (typeof window === 'undefined') return false
  
  const url = new URL(window.location.href)
  return url.pathname.startsWith('/miniapp') || 
         url.searchParams.get('miniApp') === 'true'
}