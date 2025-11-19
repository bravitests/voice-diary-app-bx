import React, { Suspense } from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "next-themes"

import { ConditionalBottomNav } from "@/components/conditional-bottom-nav"


const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Voice Diary - AI-Powered Audio Journaling App | Record, Transcribe & Analyze",
  description: "Transform your thoughts into a personal audio diary with AI transcription, smart insights, and emotional analysis. Free voice journaling app with blockchain integration.",
  keywords: "voice diary, audio journaling, AI transcription, voice notes, digital diary, speech to text, personal journal, voice recorder, AI insights, blockchain diary",
  authors: [{ name: "Voice Diary Team" }],
  creator: "Bravian Nyatoro",
  publisher: "Voice Diary",
  robots: "index, follow",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
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
  },
  twitter: {
    card: 'summary_large_image',
    site: '@diary_voiced',
    creator: '@diary_voiced',
    title: 'Voice Diary - AI Audio Journaling App',
    description: 'Transform thoughts into personal audio diaries with AI-powered insights',
    images: ['https://voicediary.xyz/hero.png']
  },
  alternates: {
    canonical: 'https://voicediary.xyz'
  },
  category: 'productivity',
  classification: 'Voice Recording, Journaling, AI Transcription',
  other: {
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: "https://voicediary.xyz/logo.png",
      button: {
        title: "Start Voice Diary",
        action: {
          type: "launch_miniapp",
          name: "VoiceDiary",
          url: "https://voicediary.xyz",
          splashImageUrl: "https://voicediary.xyz/logo.png",
          splashBackgroundColor: "#000000"
        }
      }
    }),
    'fc:frame': JSON.stringify({
      version: "1",
      imageUrl: "https://voicediary.xyz/logo.png",
      button: {
        title: "Start Voice Diary",
        action: {
          type: "launch_frame",
          name: "VoiceDiary",
          url: "https://voicediary.xyz",
          splashImageUrl: "https://voicediary.xyz/logo.png",
          splashBackgroundColor: "#000000"
        }
      }
    }),
    'of:accepts:xmtp': '2024-02-01',
    'og:image': 'https://voicediary.xyz/logo.png',
    'og:title': 'Voice Diary',
    'og:description': 'Transform your thoughts into a personal audio diary with AI-powered insights'
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className={inter.className}>
        <Suspense fallback={null}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              {children}
              <ConditionalBottomNav />
            </AuthProvider>
          </ThemeProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
