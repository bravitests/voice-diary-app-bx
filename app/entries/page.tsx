"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Mic, BookOpen, Loader2, Play, Pause, ArrowLeft, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { ShareButton } from '@/components/share-button'

interface Purpose {
  id: string
  name: string
  color: string
}

interface Recording {
  id: string
  purpose_id: string
  purpose_name: string
  purpose_color: string
  audio_duration: number
  created_at: string
  transcript: string
  summary: string
  ai_insights: string
  audio_url: string
}

interface AudioState {
  [key: string]: {
    isPlaying: boolean
    audio: HTMLAudioElement | null
    progress: number
    duration: number
  }
}

export default function EntriesPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [entries, setEntries] = useState<Recording[]>([])
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [loadingPurposes, setLoadingPurposes] = useState(true)
  const [audioStates, setAudioStates] = useState<AudioState>({})
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set())


  useEffect(() => {
    const storedFilter = localStorage.getItem("selectedFilter");
    if (storedFilter) {
      setSelectedFilter(JSON.parse(storedFilter));
    }
  }, []);

  useEffect(() => {
    if (selectedFilter) {
      localStorage.setItem("selectedFilter", JSON.stringify(selectedFilter));
    }
  }, [selectedFilter]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.firebaseUid) {
      fetchPurposes()
    }
  }, [user])

  useEffect(() => {
    if (user && !loadingPurposes) {
      fetchEntries()
    }
  }, [user, selectedFilter, loadingPurposes])

  const fetchPurposes = async () => {
    try {
      const response = await fetch(`/api/purposes?firebaseUid=${user?.firebaseUid}`)
      const data = await response.json()
      if (response.ok) {
        setPurposes(data.purposes)
      }
    } catch (error) {
      console.error("Error fetching purposes:", error)
    } finally {
      setLoadingPurposes(false)
    }
  }

  const fetchEntries = async () => {
    if (!user) return

    setIsLoadingEntries(true)
    try {
      const purposeParam = selectedFilter === "all" ? "" : `&purposeId=${selectedFilter}`
      const response = await fetch(`/api/entries?firebaseUid=${user.firebaseUid}${purposeParam}`)
      if (!response.ok) {
        throw new Error("Failed to fetch entries")
      }

      const data = await response.json()
      setEntries(data.entries || [])
    } catch (error) {
      console.error("Error fetching entries:", error)
      setEntries([])
    } finally {
      setIsLoadingEntries(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Today"
    if (diffDays === 2) return "Yesterday"
    if (diffDays <= 7) return `${diffDays - 1} days ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const toggleAudio = (entryId: string, audioUrl: string) => {
    const currentState = audioStates[entryId]

    if (currentState?.isPlaying) {
      currentState.audio?.pause()
      setAudioStates(prev => ({
        ...prev,
        [entryId]: { ...prev[entryId], isPlaying: false }
      }))
    } else {
      // Pause all other audio
      Object.entries(audioStates).forEach(([id, state]) => {
        if (state.audio && state.isPlaying) {
          state.audio.pause()
        }
      })

      let audio = currentState?.audio
      if (!audio) {
        audio = new Audio(audioUrl)

        audio.addEventListener('loadedmetadata', () => {
          setAudioStates(prev => ({
            ...prev,
            [entryId]: { ...prev[entryId], duration: audio!.duration }
          }))
        })

        audio.addEventListener('timeupdate', () => {
          setAudioStates(prev => ({
            ...prev,
            [entryId]: { ...prev[entryId], progress: audio!.currentTime }
          }))
        })

        audio.addEventListener('ended', () => {
          setAudioStates(prev => ({
            ...prev,
            [entryId]: { ...prev[entryId], isPlaying: false, progress: 0 }
          }))
        })
      }

      audio.play()
      setAudioStates(prev => ({
        ...prev,
        [entryId]: { audio, isPlaying: true, progress: prev[entryId]?.progress || 0, duration: prev[entryId]?.duration || 0 }
      }))
    }
  }

  const toggleTranscript = (entryId: string) => {
    setExpandedTranscripts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">My Entries</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Mic className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Filter */}
          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-card-foreground">Filter by Purpose</h2>
              </div>
              {loadingPurposes ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        All Entries
                      </div>
                    </SelectItem>
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

          {/* Entries List */}
          <div className="space-y-4">
            {isLoadingEntries ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : entries.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="p-8 text-center space-y-3">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
                  <h3 className="font-semibold text-card-foreground">No entries found</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedFilter === "all"
                      ? "Start recording your first voice diary entry!"
                      : `No entries found for the selected purpose.`}
                  </p>
                  <Button onClick={() => router.push("/dashboard")} className="mt-4">
                    <Mic className="w-4 h-4 mr-2" />
                    Record Entry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              entries.map((entry) => {
                return (
                  <Card key={entry.id} className="border-border bg-card hover:bg-accent/5 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${entry.purpose_color}20` }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.purpose_color }} />
                          </div>
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {entry.purpose_name}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>

                        </div>
                      </div>

                      {/* Summary */}
                      <div className="space-y-2">
                        <p className="text-sm text-card-foreground leading-relaxed">
                          {entry.summary || "Processing summary..."}
                        </p>

                        {/* Transcript Toggle */}
                        {entry.transcript && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTranscript(entry.id)}
                            className="text-xs p-0 h-auto text-muted-foreground hover:text-foreground"
                          >
                            {expandedTranscripts.has(entry.id) ? (
                              <><ChevronUp className="w-3 h-3 mr-1" />Hide Transcript</>
                            ) : (
                              <><ChevronDown className="w-3 h-3 mr-1" />Show Transcript</>
                            )}
                          </Button>
                        )}

                        {/* Expanded Transcript */}
                        {expandedTranscripts.has(entry.id) && entry.transcript && (
                          <div className="mt-2 p-3 bg-muted/50 rounded-md border">
                            <p className="text-xs text-muted-foreground mb-1">Full Transcript:</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {entry.transcript}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Share Button */}
                      <div className="pt-2 border-t border-border">
                        <ShareButton
                          entry={{
                            id: entry.id,
                            summary: entry.summary,
                            purpose_name: entry.purpose_name
                          }}
                          className="w-full text-xs h-8 gap-2 text-muted-foreground hover:text-foreground"
                        />
                      </div>
                      {/* Audio Player */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => toggleAudio(entry.id, entry.audio_url)}
                          >
                            {audioStates[entry.id]?.isPlaying ? (
                              <><Pause className="w-3 h-3 mr-1" />Pause</>
                            ) : (
                              <><Play className="w-3 h-3 mr-1" />Play</>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(entry.created_at)}
                          </p>
                        </div>

                        {/* Progress Bar */}
                        {audioStates[entry.id]?.duration > 0 && (
                          <div className="space-y-1">
                            <div className="w-full bg-muted rounded-full h-1">
                              <div
                                className="bg-primary h-1 rounded-full transition-all duration-100"
                                style={{
                                  width: `${(audioStates[entry.id].progress / audioStates[entry.id].duration) * 100}%`
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{formatDuration(Math.floor(audioStates[entry.id].progress))}</span>
                              <span>{formatDuration(Math.floor(audioStates[entry.id].duration))}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>


        </div>
      </main>
    </div>
  )
}
