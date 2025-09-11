import type { Metadata } from "next"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { WalletSection } from "@/components/wallet-section"
import { MiniKitInitializer } from "@/components/minikit-initializer"

export const metadata: Metadata = {
  title: "Voice Diary - AI-Powered Audio Journaling App | Record, Transcribe & Analyze",
  description: "Transform your thoughts into a personal audio diary with AI transcription, smart insights, and emotional analysis. Free voice journaling app with blockchain integration.",
  keywords: "voice diary, audio journaling, AI transcription, voice notes, digital diary, speech to text, personal journal, voice recorder, AI insights, blockchain diary",
  twitter: {
    card: 'summary_large_image',
    site: '@diary_voiced',
    creator: '@diary_voiced',
    title: 'Voice Diary - AI Audio Journaling App',
    description: 'Transform thoughts into personal audio diaries with AI-powered insights',
    images: ['https://voicediary.xyz/hero.png']
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://voicediary.xyz',
    title: 'Voice Diary - AI-Powered Audio Journaling App',
    description: 'Transform your thoughts into a personal audio diary with AI transcription and smart insights. Free voice journaling app.',
    siteName: 'Voice Diary',
    images: [{
      url: 'https://voicediary.xyz/hero.png',
      width: 1200,
      height: 630,
      alt: 'Voice Diary - AI Audio Journaling App'
    }]
  }
}

export default function LandingPage() {


  return (
    <>
      <MiniKitInitializer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Voice Diary",
            "description": "AI-powered voice journaling app with transcription and emotional insights",
            "applicationCategory": "ProductivityApplication",
            "url": "https://voicediary.xyz",
            "author": {
              "@type": "Organization",
              "name": "Voice Diary Team"
            },
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          })
        }}
      />
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header is unchanged */}
      <header className="px-6 py-4 flex-shrink-0">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative">
              <Image 
                src="/logo.png" 
                alt="VoiceDiary Logo" 
                width={32} 
                height={32} 
                className="rounded-xl" 
              />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">VoiceDiary</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content is unchanged */}
      <main className="flex-1 flex items-center justify-center px-6 py-4">
        <div className="max-w-sm mx-auto w-full space-y-8">
          
          <div className="text-center space-y-8">
            <div className="relative mx-auto">
              <Image 
                src="/hero.png" 
                alt="VoiceDiary Hero" 
                width={280} 
                height={320} 
                className="mx-auto" 
                priority
              />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground leading-tight">
                AI Voice Journaling<br />
                <span className="text-primary">Made Simple</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed px-4">
                Record audio diaries, get AI transcription & emotional insights. Free voice journaling app with blockchain security.
              </p>
            </div>
          </div>

          <WalletSection />
        </div>
      </main>
    </div>
    </>
  )
}