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
  const [micError, setMicError] = useState<string | null>(null)

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
    setMicError(null)
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
      setMicError("Microphone access was denied. Please enable it in your browser settings and try again.")
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
    <div className="fixed inset-0 bg-background z-50">
      <div className="w-full max-w-md mx-auto flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between p-4">
          <h2 className="text-lg font-medium text-foreground">New Entry</h2>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={isProcessing}>
            <X className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">

          {micError ? (
            <div className="text-center text-destructive bg-destructive/10 p-6 rounded-lg">
              <h3 className="font-bold">Microphone Error</h3>
              <p className="mt-2 text-sm">{micError}</p>
              <Button onClick={initializeAudio} variant="secondary" className="mt-4">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Audio Visualizer */}
              <div className="w-48 h-48 rounded-full bg-primary/5 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="flex items-end gap-1 h-24">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const barHeight = Math.max(4, audioLevel * 96 * (0.5 + Math.sin(i * 2) * 0.5))
                      return (
                        <div
                          key={i}
                          className="w-2 rounded-full transition-all duration-100"
                          style={{
                            height: `${barHeight}px`,
                            backgroundColor: `hsl(var(--primary) / ${isRecording && !isPaused ? 0.5 + audioLevel * 0.5 : 0.3})`,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Timer */}
              <div className="text-center">
                <div className="text-6xl font-mono font-bold text-foreground">{formatTime(duration)}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {MAX_DURATION - duration > 0 ? `${formatTime(MAX_DURATION - duration)} remaining` : "Time limit reached"}
                </p>
              </div>

              {/* Controls */}
              <div className="w-full space-y-4">
                <div className="flex justify-center items-center gap-4">
                  <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-card">
                    {/* Placeholder for rewind/restart */}
                  </Button>
                  {isRecording ? (
                    <Button
                      size="icon"
                      onClick={pauseRecording}
                      className="w-20 h-20 rounded-full bg-primary text-primary-foreground shadow-lg"
                    >
                      {isPaused ? <Play className="w-8 h-8 fill-current" /> : <Pause className="w-8 h-8 fill-current" />}
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      onClick={startRecording}
                      className="w-20 h-20 rounded-full bg-primary text-primary-foreground shadow-lg"
                    >
                      <Mic className="w-8 h-8" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-card">
                    {/* Placeholder for forward/skip */}
                  </Button>
                </div>
                <div className="flex gap-4">
                  <Button variant="secondary" onClick={handleClose} className="flex-1 h-12">
                    Cancel
                  </Button>
                  <Button onClick={stopRecording} className="flex-1 h-12">
                    Save
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
