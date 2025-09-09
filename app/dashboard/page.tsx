"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Settings, Loader2, Plus, X, User, Share2 } from "lucide-react"
import Image from "next/image"
import { RecordingModal } from "@/components/recording-modal"
import { AddPurposeModal } from "@/components/add-purpose-modal"
import { ShareButton } from "@/components/share-button"

interface Purpose {
  id: string
  name: string
  description: string
  color: string
  is_default: boolean
}

export default function Dashboard() {
  const { user, logout, isLoading } = useAuth()
  const [selectedPurpose, setSelectedPurpose] = useState("")
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [showRecordingModal, setShowRecordingModal] = useState(false)
  const [isCheckingLimit, setIsCheckingLimit] = useState(false)
  const [loadingPurposes, setLoadingPurposes] = useState(true)
  const [showAddPurpose, setShowAddPurpose] = useState(false)
  const [purposeError, setPurposeError] = useState<string | null>(null)
  const [showNameBanner, setShowNameBanner] = useState(false)

  useEffect(() => {
    const storedPurpose = localStorage.getItem("selectedPurpose");
    if (storedPurpose) {
      setSelectedPurpose(JSON.parse(storedPurpose));
    }
  }, []);

  useEffect(() => {
    if (selectedPurpose) {
      localStorage.setItem("selectedPurpose", JSON.stringify(selectedPurpose));
    }
  }, [selectedPurpose]);

  useEffect(() => {
    if (user?.walletAddress && !isLoading) {
      fetchPurposes()
      // Show name banner if user has no name
      setShowNameBanner(!user?.name)
    }
  }, [user?.walletAddress, user?.name, isLoading])

  const fetchPurposes = async () => {
    if (!user?.walletAddress) {
      console.log("No wallet address available for fetching purposes")
      return
    }

    setLoadingPurposes(true)
    setPurposeError(null)
    try {
      const response = await fetch(`/api/purposes?wallet_address=${user.walletAddress}`)
      const data = await response.json()
      if (response.ok) {
        setPurposes(data.purposes || [])
        const defaultPurpose = data.purposes?.find((p: Purpose) => p.is_default)
        if (defaultPurpose) {
          setSelectedPurpose(defaultPurpose.id)
        } else if (data.purposes?.length > 0) {
          setSelectedPurpose(data.purposes[0].id)
        }
      } else {
        console.error("Purposes API error:", data.error)
        setPurposeError("Failed to load purposes. Please try again.")
      }
    } catch (error) {
      console.error("Error fetching purposes:", error)
      setPurposeError("An unexpected error occurred. Please try again.")
    } finally {
      setLoadingPurposes(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleStartRecording = async () => {
    if (!selectedPurpose) {
      alert("Please select a purpose for your entry")
      return
    }

    setIsCheckingLimit(true)
    try {
      setShowRecordingModal(true)
    } catch (error) {
      console.error("Error checking usage limit:", error)
      alert("Unable to check usage limits. Please try again.")
    } finally {
      setIsCheckingLimit(false)
    }
  }

  

  const selectedPurposeData = purposes.find((p) => p.id === selectedPurpose)

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <Image src="/logo.png" alt="VoiceDiary Logo" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg text-foreground">VoiceDiary</span>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
            />
            <Button variant="ghost" size="sm" onClick={logout}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Name Setup Banner */}
      {showNameBanner && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Complete your profile</p>
              <p className="text-xs text-muted-foreground">Set your name to personalize your experience</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/profile'}
              className="text-primary hover:text-primary/80 text-xs px-2 h-7"
            >
              Set Name
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowNameBanner(false)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <main className="px-4 py-6 flex flex-col min-h-[calc(100vh-140px)]">
        <div className="max-w-lg mx-auto space-y-6 flex-1 flex flex-col w-full">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user?.name || user?.walletAddress?.slice(0, 6) || 'User'}!
            </h1>
            <p className="text-muted-foreground">Ready to capture your thoughts?</p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-card-foreground">What's on your mind?</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAddPurpose(true)} className="h-8 w-8 p-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {loadingPurposes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : purposeError ? (
                <div className="text-center py-4 text-destructive">
                  <p>{purposeError}</p>
                  <Button onClick={fetchPurposes} variant="link">Retry</Button>
                </div>
              ) : (
                <Select value={selectedPurpose} onValueChange={setSelectedPurpose}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Choose a purpose for your entry" />
                  </SelectTrigger>
                  <SelectContent>
                    {purposes.map((purpose) => (
                      <SelectItem key={purpose.id} value={purpose.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: purpose.color }} />
                          {purpose.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <div className="flex-1 flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-thistle via-fairy-tale to-carnation-pink p-1 shadow-2xl">
                <div className="w-full h-full rounded-full  flex items-center justify-center">
                  <Button
                    size="lg"
                    onClick={handleStartRecording}
                    disabled={!selectedPurpose || isCheckingLimit || loadingPurposes}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg border-0"
                  >
                    {isCheckingLimit ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-14 h-14 text-black" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>



      <RecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        purpose={selectedPurpose}
        onSuccess={() => {
          alert("Recording saved and processed successfully!");
          const defaultPurpose = purposes.find((p) => p.is_default);
          if (defaultPurpose) {
            setSelectedPurpose(defaultPurpose.id);
          }
        }}
      />

      <AddPurposeModal
        isOpen={showAddPurpose}
        onClose={() => setShowAddPurpose(false)}
        onAdd={async (name, description, color) => {
          try {
            const response = await fetch('/api/purposes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletAddress: user?.walletAddress,
                name,
                description,
                color
              })
            })
            if (response.ok) {
              fetchPurposes()
            }
          } catch (error) {
            console.error('Error adding purpose:', error)
          }
        }}
      />
    </div>
  )
}
