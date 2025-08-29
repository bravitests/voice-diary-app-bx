"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Mic, Pause, Square, Play, Loader2, Crown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface RecordingModalProps {
  isOpen: boolean
  onClose: () => void
  purpose: string
  onSave: (audioBlob: Blob, duration: number) => void
}

export function RecordingModal({ isOpen, onClose, purpose, onSave }: RecordingModalProps) {
  const { user } = useAuth()
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)

  const MAX_DURATION = user?.subscriptionTier === "pro" ? 300 : 120 // 5 minutes for pro, 2 minutes for free

  useEffect(() => {
    if (isOpen) {
      initializeAudio()
    } else {
      cleanup()
    }

    return cleanup
  }, [isOpen])

  useEffect(() => {
    if (duration >= MAX_DURATION && isRecording) {
      stopRecording()
    }
  }, [duration, isRecording])

  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Setup audio context for visualization
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256

      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
        setIsProcessing(true)

        try {
          await onSave(audioBlob, duration)
        } finally {
          setIsProcessing(false)
          chunksRef.current = []
        }
      }

      startVisualization()
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Unable to access microphone. Please check your permissions.")
    }
  }

  const startVisualization = () => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    const updateVisualization = () => {
      if (!analyserRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      setAudioLevel(average / 255) // Normalize to 0-1

      animationRef.current = requestAnimationFrame(updateVisualization)
    }

    updateVisualization()
  }

  const startRecording = () => {
    if (!mediaRecorderRef.current) return

    mediaRecorderRef.current.start()
    setIsRecording(true)
    setIsPaused(false)
    setDuration(0)

    intervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1)
    }, 1000)
  }

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !intervalRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } else {
      mediaRecorderRef.current.pause()
      clearInterval(intervalRef.current)
    }
    setIsPaused(!isPaused)
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !intervalRef.current) return

    mediaRecorderRef.current.stop()
    clearInterval(intervalRef.current)
    setIsRecording(false)
    setIsPaused(false)
    cleanup()
  }

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setDuration(0)
    setAudioLevel(0)
    setIsRecording(false)
    setIsPaused(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleClose = () => {
    if (isProcessing) return // Prevent closing during AI processing
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm bg-card border-border">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Recording Entry</h2>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0" disabled={isProcessing}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Purpose */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Purpose: <span className="font-medium text-foreground">{purpose}</span>
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              {user?.subscriptionTier === "pro" && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Crown className="w-3 h-3" />
                  Pro
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Max: {formatTime(MAX_DURATION)} {user?.subscriptionTier === "free" && "(Upgrade for 5min)"}
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-foreground">{formatTime(duration)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {MAX_DURATION - duration > 0 ? `${formatTime(MAX_DURATION - duration)} remaining` : "Time limit reached"}
            </p>
          </div>

          {/* Audio Visualizer */}
          <div className="flex justify-center">
            <div className="flex items-end gap-1 h-16">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(4, audioLevel * 60 * (0.5 + Math.random() * 0.5))}px`,
                    opacity: isRecording && !isPaused ? 0.7 + audioLevel * 0.3 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {isProcessing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing with AI...
              </div>
            ) : !isRecording ? (
              <Button
                size="lg"
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Mic className="w-6 h-6" />
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={pauseRecording}
                  className="w-12 h-12 rounded-full bg-transparent"
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
                <Button size="lg" variant="destructive" onClick={stopRecording} className="w-12 h-12 rounded-full">
                  <Square className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          {/* Status */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isProcessing
                ? "Processing your recording with AI..."
                : !isRecording
                  ? "Tap the microphone to start recording"
                  : isPaused
                    ? "Recording paused"
                    : "Recording in progress..."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
