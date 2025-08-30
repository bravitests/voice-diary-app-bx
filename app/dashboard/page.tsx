"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, BookOpen, MessageCircle, User, Settings, Loader2, Plus } from "lucide-react"
import { RecordingModal } from "@/components/recording-modal"
import { AddPurposeModal } from "@/components/add-purpose-modal"

interface Purpose {
  id: string
  name: string
  description: string
  color: string
  is_default: boolean
}

export default function Dashboard() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const [selectedPurpose, setSelectedPurpose] = useState("")
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [showRecordingModal, setShowRecordingModal] = useState(false)
  const [isCheckingLimit, setIsCheckingLimit] = useState(false)
  const [loadingPurposes, setLoadingPurposes] = useState(true)
  const [showAddPurpose, setShowAddPurpose] = useState(false)
  const [purposeError, setPurposeError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.walletAddress) {
      fetchPurposes()
    }
  }, [user, isLoading, router])

  const fetchPurposes = async () => {
    setLoadingPurposes(true)
    setPurposeError(null)
    try {
      const response = await fetch(`/api/purposes?wallet_address=${user?.walletAddress}`)
      const data = await response.json()
      if (response.ok) {
        setPurposes(data.purposes)
        const defaultPurpose = data.purposes.find((p: Purpose) => p.is_default)
        if (defaultPurpose) {
          setSelectedPurpose(defaultPurpose.id)
        }
      } else {
        setPurposeError("Failed to load purposes. Please try again.")
      }
    } catch (error) {
      console.error("Error fetching purposes:", error)
      setPurposeError("An unexpected error occurred. Please try again.")
    } finally {
      setLoadingPurposes(false)
    }
  }

  if (isLoading) {
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

  const handleSaveRecording = async (audioBlob: Blob, duration: number) => {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("walletAddress", user.walletAddress!)
      formData.append("purposeId", selectedPurpose)
      formData.append("duration", duration.toString())

      const createResponse = await fetch("/api/recordings/create", {
        method: "POST",
        body: formData,
      })

      if (!createResponse.ok) {
        throw new Error("Failed to create recording")
      }

      const { recordingId, audioUrl } = await createResponse.json()

      const transcribeFormData = new FormData()
      transcribeFormData.append("recordingId", recordingId)
      transcribeFormData.append("audioUrl", audioUrl)
      transcribeFormData.append("walletAddress", user.walletAddress!)
      transcribeFormData.append("subscriptionTier", user.subscriptionTier || "free")

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: transcribeFormData,
      })

      if (!transcribeResponse.ok) {
        throw new Error("Failed to transcribe recording")
      }

      const result = await transcribeResponse.json()
      console.log("[v0] Recording saved and transcribed:", result)

      setSelectedPurpose(purposes.find((p) => p.is_default)?.id || "")
      alert("Recording saved successfully!")
    } catch (error) {
      console.error("Error saving recording:", error)
      alert("Failed to save recording. Please try again.")
    }
  }

  const selectedPurposeData = purposes.find((p) => p.id === selectedPurpose)

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">VoiceDiary</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 flex flex-col min-h-[calc(100vh-140px)]">
        <div className="max-w-lg mx-auto space-y-6 flex-1 flex flex-col w-full">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user.name || user.walletAddress?.slice(0, 6)}!
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
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <Button
                    size="lg"
                    onClick={handleStartRecording}
                    disabled={!selectedPurpose || isCheckingLimit || loadingPurposes}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg border-0"
                  >
                    {isCheckingLimit ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
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
        purpose={selectedPurposeData?.name || ""}
        onSave={handleSaveRecording}
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
