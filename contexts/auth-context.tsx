"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
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
    }

    setIsLoading(false)
  }, [mounted, isConnected, address])

  const createUserFromWallet = async (walletAddress: string) => {
    const newUser: User = {
      id: walletAddress,
      walletAddress,
      subscriptionTier: "free",
      isAdmin: false,
    }

    setUser(newUser)
    console.log("[v0] Created user from wallet:", walletAddress)
  }

  const updateProfile = async (name: string, email: string): Promise<boolean> => {
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
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        updateProfile,
        logout,
        isLoading,
        isWalletConnected: isConnected,
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