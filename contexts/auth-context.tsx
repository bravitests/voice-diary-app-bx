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
  const [isLoading, setIsLoading] = useState(true) // Start as true to handle initial load

  // STEP 1: On initial mount, check for a user in localStorage first.
  // This is the highest priority and provides an instant "logged in" experience.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      // If parsing fails, ensure corrupted data is cleared
      localStorage.removeItem("user");
    } finally {
      // We are done with the initial check, so we can stop loading.
      setIsLoading(false);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // The function to create or fetch a user from your backend
  const createUserFromWallet = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });

      if (response.ok) {
        const { user: dbUser } = await response.json();
        setUser(dbUser);
        // Persist the new user session to localStorage
        localStorage.setItem("user", JSON.stringify(dbUser));
        console.log("User authenticated and stored in localStorage:", dbUser.id);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Authentication API call failed:", errorData.error);
        if (typeof window !== 'undefined') {
          alert(`Authentication failed: ${errorData.error}.`);
        }
      }
    } catch (error) {
      console.error("Network or authentication error:", error);
      if (typeof window !== 'undefined') {
        alert('A network error occurred during authentication. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // STEP 2: Only if there's no user from localStorage, we treat wallet connection
  // as a "login" event.
  useEffect(() => {
    // This effect will only run if:
    // 1. The wallet is connected (`isConnected` and `address` are available)
    // 2. There is NO user currently in the state (`!user`)
    if (isConnected && address && !user) {
      createUserFromWallet(address);
    }
  }, [isConnected, address, user, createUserFromWallet]);

  const updateProfile = useCallback(async (name: string, email: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const updatedUser = { ...user, name, email };
      setUser(updatedUser);
      // Ensure the updated profile is saved to localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
      console.log("User profile updated and saved to localStorage.");
      // You should also send this update to your backend API
      return true;
    } catch (error) {
      console.error("Profile update failed:", error);
      return false;
    }
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    // This is the only place where the user is intentionally removed from localStorage
    localStorage.removeItem("user");
    console.log("User logged out and removed from localStorage.");
  }, []);

  const contextValue = useMemo(() => ({
    user,
    updateProfile,
    logout,
    isLoading,
    isWalletConnected: isConnected,
  }), [user, updateProfile, logout, isLoading, isConnected]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}