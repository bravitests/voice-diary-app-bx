"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import { auth } from "@/lib/firebase"
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth"

interface User {
  id: string
  firebaseUid: string
  email: string | null
  name: string | null
  photoURL: string | null
  subscriptionTier: "free" | "starter" | "pro"
  subscriptionExpiry?: Date
  isAdmin?: boolean
}

interface AuthContextType {
  user: User | null
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Sync with backend
          const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebaseUid: firebaseUser.uid,
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL
            })
          })

          if (response.ok) {
            const { user: dbUser } = await response.json()
            setUser({
              id: dbUser.id, // Use DB ID
              firebaseUid: firebaseUser.uid,
              email: dbUser.email,
              name: dbUser.name,
              photoURL: firebaseUser.photoURL,
              subscriptionTier: dbUser.subscriptionTier,
              subscriptionExpiry: dbUser.subscriptionExpiry,
              isAdmin: dbUser.isAdmin // Assuming backend returns this
            })
          } else {
            console.error("Failed to sync user with backend")
            // Fallback to Firebase user data if backend fails? 
            // Or maybe logout? For now, fallback.
            setUser({
              id: firebaseUser.uid,
              firebaseUid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              subscriptionTier: "free",
            })
          }
        } catch (error) {
          console.error("Error syncing user with backend", error)
          setUser({
            id: firebaseUser.uid,
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            subscriptionTier: "free",
          })
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Error signing in with Google", error)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Error signing out", error)
    }
  }, [])

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) return

    // Optimistic update
    setUser(prev => prev ? { ...prev, ...data } : null)

    // TODO: Implement backend update if needed
    // For now, we just update local state which might be overwritten on refresh
    // You should probably add an API endpoint to update user profile
  }, [user])

  const contextValue = useMemo(() => ({
    user,
    signInWithGoogle,
    logout,
    updateProfile,
    isLoading,
  }), [user, signInWithGoogle, logout, updateProfile, isLoading])

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