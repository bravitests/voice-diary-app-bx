"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function AuthSection() {
    const { user, signInWithGoogle, isLoading } = useAuth()
    const router = useRouter()
    const [isSigningIn, setIsSigningIn] = useState(false)

    const handleGetStarted = () => {
        if (user) {
            router.push("/dashboard")
        }
    }

    const handleSignIn = async () => {
        try {
            setIsSigningIn(true)
            await signInWithGoogle()
        } catch (error) {
            console.error("Sign in failed", error)
        } finally {
            setIsSigningIn(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center pt-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6 pt-4">
            {user ? (
                <div className="space-y-4">
                    <Button
                        size="lg"
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        onClick={handleGetStarted}
                    >
                        <span>Continue to Dashboard</span>
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">
                        Signed in as {user.name || user.email}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-foreground mb-2">Get Started</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Sign in to begin your journey
                        </p>
                        <div className="flex justify-center">
                            <Button
                                onClick={handleSignIn}
                                disabled={isSigningIn}
                                className="w-full max-w-xs bg-slate-100 text-black border border-slate-200 hover:bg-slate-200 hover:border-slate-300 dark:bg-white dark:text-black dark:hover:bg-gray-100 shadow-sm"
                            >
                                {isSigningIn ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                )}
                                Sign in with Google
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                        <span>Free</span>
                        <span>•</span>
                        <span>AI Powered</span>
                        <span>•</span>
                        <span>Secure</span>
                    </div>
                </div>
            )}
        </div>
    )
}
