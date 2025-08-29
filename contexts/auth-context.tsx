"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface User {
  id: string
  walletAddress: string
  name?: string
  email?: string
  isAdmin?: boolean
  subscriptionTier: "free" | "pro"
  subscriptionExpiry?: Date
}

interface AuthContextType {
  user: User | null
  connectWallet: () => Promise<boolean>
  updateProfile: (name: string, email: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isWalletConnected: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWalletConnected, setIsWalletConnected] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem("voicediary_user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsWalletConnected(true)
    } else {
      // Create a test user for development
      const testUser: User = {
        id: "test-user-123",
        walletAddress: "0x13a68ffe903ce",
        name: "Test User",
        subscriptionTier: "free",
        isAdmin: false,
      }
      setUser(testUser)
      setIsWalletConnected(true)
      localStorage.setItem("voicediary_user", JSON.stringify(testUser))
      console.log("[v0] Created test user for development")
    }

    // Check if MiniKit is available (Base mini app environment)
    if (typeof window !== "undefined" && (window as any).MiniKit) {
      checkWalletConnection()
    }

    setIsLoading(false)
  }, [])

  const checkWalletConnection = async () => {
    try {
      const miniKit = (window as any).MiniKit
      if (miniKit && miniKit.isConnected) {
        const address = await miniKit.getAddress()
        if (address && !user) {
          // Create user from wallet address
          await createUserFromWallet(address)
        }
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error)
    }
  }

  const createUserFromWallet = async (walletAddress: string) => {
    const newUser: User = {
      id: walletAddress,
      walletAddress,
      subscriptionTier: "free",
      isAdmin: false,
    }

    setUser(newUser)
    setIsWalletConnected(true)
    localStorage.setItem("voicediary_user", JSON.stringify(newUser))

    // TODO: Save to database
    console.log("[v0] Created user from wallet:", walletAddress)
  }

  const connectWallet = async (): Promise<boolean> => {
    try {
      setIsLoading(true)

      if (typeof window !== "undefined" && (window as any).MiniKit) {
        const miniKit = (window as any).MiniKit
        const address = await miniKit.connect()

        if (address) {
          await createUserFromWallet(address)
          return true
        }
      } else {
        // Fallback for development - mock wallet connection
        const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`
        await createUserFromWallet(mockAddress)
        return true
      }

      return false
    } catch (error) {
      console.error("Wallet connection failed:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (name: string, email: string): Promise<boolean> => {
    if (!user) return false

    try {
      const updatedUser = { ...user, name, email }
      setUser(updatedUser)
      localStorage.setItem("voicediary_user", JSON.stringify(updatedUser))

      // TODO: Update in database
      console.log("[v0] Updated user profile:", { name, email })
      return true
    } catch (error) {
      console.error("Profile update failed:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setIsWalletConnected(false)
    localStorage.removeItem("voicediary_user")

    if (typeof window !== "undefined" && (window as any).MiniKit) {
      try {
        ;(window as any).MiniKit.disconnect()
      } catch (error) {
        console.error("Error disconnecting wallet:", error)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        connectWallet,
        updateProfile,
        logout,
        isLoading,
        isWalletConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
