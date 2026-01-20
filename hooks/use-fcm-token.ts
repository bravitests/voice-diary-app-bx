"use client"

import { useEffect, useState } from "react"
import { getMessaging, getToken } from "firebase/messaging"
import { app } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export function useFcmToken() {
    const { user } = useAuth()
    const [token, setToken] = useState<string | null>(null)
    const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | null>(null)

    useEffect(() => {
        const retrieveToken = async () => {
            try {
                if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                    // Check if permission is already granted
                    if (Notification.permission === "granted") {
                        const messaging = getMessaging(app)
                        const currentToken = await getToken(messaging, {
                            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                        })
                        if (currentToken) {
                            setToken(currentToken)
                            // Sync with backend if user is logged in
                            if (user?.id) {
                                syncTokenWithBackend(user.id, currentToken)
                            }
                        }
                    }
                    setNotificationPermissionStatus(Notification.permission)
                }
            } catch (error) {
                console.error("An error occurred while retrieving token:", error)
            }
        }

        retrieveToken()
    }, [user])

    const requestPermission = async () => {
        try {
            if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                const permission = await Notification.requestPermission()
                setNotificationPermissionStatus(permission)

                if (permission === "granted") {
                    const messaging = getMessaging(app)
                    const currentToken = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                    })
                    if (currentToken) {
                        setToken(currentToken)
                        if (user?.id) {
                            await syncTokenWithBackend(user.id, currentToken)
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error requesting permission:", error)
        }
    }

    const syncTokenWithBackend = async (userId: string, fcmToken: string) => {
        try {
            await fetch('/api/users/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, fcmToken })
            })
            console.log('[FCM] Token synced with backend')
        } catch (error) {
            console.error('[FCM] Failed to sync token:', error)
        }
    }

    return { token, notificationPermissionStatus, requestPermission }
}
