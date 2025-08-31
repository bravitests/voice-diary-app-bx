"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import { useAccount } from "wagmi"

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
  updateProfile: (name: string, email: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isWalletConnected: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (isConnected && address) {
      createUserFromWallet(address)
    } else {
      setUser(null)
      setIsLoading(false)
    }
  }, [mounted, isConnected, address])

  const createUserFromWallet = useCallback(async (walletAddress: string) => {
    try {
      setIsLoading(true)
      
      // Call API to create user in database
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })

      if (response.ok) {
        const { user: dbUser } = await response.json()
        setUser(dbUser)
        console.log("[v0] User created/loaded from database:", dbUser.id)
      } else {
        // Fallback to client-side user if API fails
        const fallbackUser: User = {
          id: walletAddress,
          walletAddress,
          subscriptionTier: "free",
          isAdmin: false,
        }
        setUser(fallbackUser)
        console.log("[v0] Created fallback user:", walletAddress)
      }
    } catch (error) {
      console.error("Error creating user:", error)
      // Fallback to client-side user
      const fallbackUser: User = {
        id: walletAddress,
        walletAddress,
        subscriptionTier: "free",
        isAdmin: false,
      }
      setUser(fallbackUser)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (name: string, email: string): Promise<boolean> => {
    if (!user) return false

    try {
      const updatedUser = { ...user, name, email }
      setUser(updatedUser)
      console.log("[v0] Updated user profile:", { name, email })
      return true
    } catch (error) {
      console.error("Profile update failed:", error)
      return false
    }
  }, [user])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const contextValue = useMemo(() => ({
    user,
    updateProfile,
    logout,
    isLoading,
    isWalletConnected: isConnected,
  }), [user, updateProfile, logout, isLoading, isConnected])

  return (
    <AuthContext.Provider value={contextValue}>
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