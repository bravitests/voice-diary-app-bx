import React, { Suspense } from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { MiniKitContextProvider } from "@/providers/MiniKitProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VoiceDiary - Your Voice, Your Story",
  description: "Transform your thoughts into a personal audio diary with AI-powered insights",
  generator: "v0.app",
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://voice-diary-app-bx.vercel.app/logo.png',
    'of:accepts:xmtp': '2024-02-01',
    'og:image': 'https://voice-diary-app-bx.vercel.app/logo.png',
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
                {children}
              </AuthProvider>
            </ThemeProvider>
          </MiniKitContextProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
