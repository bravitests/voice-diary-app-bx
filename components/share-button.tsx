"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Loader2 } from 'lucide-react'


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
  const handleShare = async () => {
    setIsSharing(true)

    try {
      // Native sharing
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
      } else {
        // Fallback for desktop/unsupported browsers
        try {
          await navigator.clipboard.writeText('https://voicediary.xyz')
          alert('Link copied to clipboard!')
        } catch (clipboardError) {
          console.error('Clipboard failed:', clipboardError)
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