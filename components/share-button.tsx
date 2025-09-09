"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Loader2 } from 'lucide-react'
import { useComposeCast } from '@coinbase/onchainkit/minikit'

interface ShareButtonProps {
  entry?: {
    id: string
    summary: string
    purpose_name: string
  }
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function ShareButton({ entry, variant = 'outline', size = 'sm', className }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)
  const { composeCast } = useComposeCast()

  const handleShare = async () => {
    setIsSharing(true)
    
    try {
      const shareText = 'Just recorded my thoughts with VoiceDiary! 🎙️ AI-powered voice journaling on @base ✨'
      
      await composeCast({
        text: shareText,
        embeds: ['https://voicediary.xyz']
      })
    } catch (error) {
      console.error('Failed to share via Farcaster:', error)
      
      // Fallback to native sharing
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'VoiceDiary - Voice Journaling',
            text: 'Transform your thoughts into a personal audio diary with AI-powered insights',
            url: 'https://voicediary.xyz'
          })
        } catch (shareError) {
          console.error('Native share failed:', shareError)
          // Final fallback - copy to clipboard
          try {
            await navigator.clipboard.writeText('https://voicediary.xyz')
            // You could show a toast here
          } catch (clipboardError) {
            console.error('Clipboard failed:', clipboardError)
          }
        }
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={isSharing}
      className={className}
    >
      {isSharing ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Share2 className="w-3 h-3" />
      )}
      {size !== 'sm' && (
        <span className="ml-2">
          {isSharing ? 'Sharing...' : (entry ? 'Share Entry' : 'Share App')}
        </span>
      )}
    </Button>
  )
}