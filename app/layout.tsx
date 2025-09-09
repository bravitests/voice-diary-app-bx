import React, { Suspense } from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { MiniKitContextProvider } from "@/providers/MiniKitProvider"
import { ConditionalBottomNav } from "@/components/conditional-bottom-nav"
import { FarcasterSplashManager } from "@/components/farcaster-splash-manager"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Voice Diary",
  description: "Transform your thoughts into a personal audio diary with AI-powered insights",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
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
    <html lang="en" className="antialiased">
      <body className={inter.className}>
        <Suspense fallback={null}>
          <MiniKitContextProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AuthProvider>
                <FarcasterSplashManager />
                {children}
                <ConditionalBottomNav />
              </AuthProvider>
            </ThemeProvider>
          </MiniKitContextProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
