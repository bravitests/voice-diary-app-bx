"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, Mic, Pause, Play } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "next-themes"
import { getModalThemeColors } from "@/lib/modal-theme"

interface RecordingModalProps {
  isOpen: boolean
  onClose: () => void
  purpose: string
  onSave: (audioBlob: Blob, duration: number) => void
}

export function RecordingModal({ isOpen, onClose, purpose, onSave }: RecordingModalProps) {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const colors = getModalThemeColors(resolvedTheme || 'light')
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)
  const finalDurationRef = useRef<number>(0)

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
    if (isInitialized) return
    
    setMicError(null)
    setIsInitialized(false)
    
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
        if (isSaving) {
          await saveRecording()
        }
      }

      startVisualization()
      setIsInitialized(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setMicError("Microphone access was denied. Please enable it in your browser settings and try again.")
      setIsInitialized(false)
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

    // Check if MediaRecorder is already recording
    if (mediaRecorderRef.current.state === 'recording') {
      console.warn('MediaRecorder is already recording')
      return
    }

    // Only start if MediaRecorder is in inactive state
    if (mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)

      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    }
  }

  const pauseRecording = () => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      // Resume recording
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume()
        intervalRef.current = setInterval(() => {
          setDuration((prev) => prev + 1)
        }, 1000)
        setIsPaused(false)
      }
    } else {
      // Pause recording
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause()
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsPaused(true)
      }
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return

    // Capture the current duration before stopping
    finalDurationRef.current = duration

    // Only stop if MediaRecorder is recording or paused
    if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.stop()
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setIsRecording(false)
    setIsPaused(false)
    // Note: Don't call cleanup() here as it will stop the stream before the onstop event fires
  }

  const handleSave = async () => {
    if (!isRecording && duration === 0) return
    
    setIsSaving(true)
    
    if (isRecording) {
      // Stop recording first, which will trigger the save via onstop event
      stopRecording()
    } else if (chunksRef.current.length > 0) {
      // Save recording immediately
      await saveRecording()
    } else {
      setIsSaving(false)
    }
  }

  const saveRecording = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
    const recordingDuration = finalDurationRef.current || duration
    
    try {
      // Call the original onSave to get user data
      await onSave(audioBlob, recordingDuration)
      
      // Close modal immediately after saving
      onClose()
    } catch (error) {
      console.error("Error saving recording:", error)
      setIsSaving(false)
    }
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
    mediaRecorderRef.current = null
    finalDurationRef.current = 0
    setDuration(0)
    setAudioLevel(0)
    setIsRecording(false)
    setIsPaused(false)
    setIsInitialized(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleClose = () => {
    if (isSaving) return // Prevent closing during save processing
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: colors.overlay }}
    >
      <div
        className="w-full max-w-md flex flex-col rounded-lg shadow-2xl"
        style={{ backgroundColor: colors.background, color: colors.text, maxHeight: '90vh' }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between p-4 border-b rounded-t-lg"
          style={{ backgroundColor: colors.headerBackground, borderColor: colors.headerBorder }}
        >
          <h2 className="text-lg font-medium" style={{ color: colors.text }}>New Entry</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isSaving}
            className="hover:opacity-80"
          >
            <X className="w-5 h-5" style={{ color: colors.textSecondary }} />
          </Button>
        </header>

        <div
          className="flex-1 flex flex-col items-center justify-between p-6 overflow-y-auto"
          style={{ backgroundColor: colors.background, minHeight: 0 }}
        >

          {micError ? (
            <div
              className="text-center border p-6 rounded-lg"
              style={{
                backgroundColor: colors.errorBackground,
                borderColor: colors.errorBorder,
                color: colors.errorText
              }}
            >
              <h3 className="font-bold">Microphone Error</h3>
              <p className="mt-2 text-sm">{micError}</p>
              <Button
                onClick={initializeAudio}
                className="mt-4"
                style={{
                  backgroundColor: colors.buttonDanger,
                  color: colors.buttonDangerText,
                  border: 'none'
                }}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center space-y-6 flex-1">
                {/* Audio Visualizer */}
                <div
                  className="w-40 h-40 rounded-full border-2 flex items-center justify-center"
                  style={{
                    backgroundColor: colors.visualizerBackground,
                    borderColor: colors.border
                  }}
                >
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.headerBackground }}
                  >
                    <div className="flex items-end gap-1 h-16">
                      {Array.from({ length: 8 }).map((_, i) => {
                        const barHeight = Math.max(3, audioLevel * 64 * (0.5 + Math.sin(i * 2) * 0.5))
                        return (
                          <div
                            key={i}
                            className="w-1.5 rounded-full transition-all duration-100"
                            style={{
                              height: `${barHeight}px`,
                              backgroundColor: isRecording && !isPaused
                                ? colors.visualizerActive
                                : colors.visualizerForeground,
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Timer */}
                <div className="text-center">
                  <div
                    className="text-4xl font-mono font-bold"
                    style={{ color: colors.text }}
                  >
                    {formatTime(duration)}
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{ color: colors.textSecondary }}
                  >
                    {MAX_DURATION - duration > 0 ? `${formatTime(MAX_DURATION - duration)} remaining` : "Time limit reached"}
                  </p>
                </div>

                {/* Record/Pause Button */}
                <div className="flex justify-center">
                  {isRecording ? (
                    <Button
                      size="icon"
                      onClick={pauseRecording}
                      className="w-16 h-16 rounded-full shadow-lg border-none"
                      style={{
                        backgroundColor: colors.buttonPrimary,
                        color: colors.buttonPrimaryText
                      }}
                    >
                      {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      onClick={startRecording}
                      disabled={!isInitialized}
                      className="w-16 h-16 rounded-full shadow-lg border-none"
                      style={{
                        backgroundColor: isInitialized ? colors.buttonPrimary : colors.textMuted,
                        color: colors.buttonPrimaryText
                      }}
                    >
                      <Mic className="w-6 h-6" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Bottom Buttons - Always Visible */}
              <div className="flex gap-4 p-4 border-t" style={{ borderColor: colors.headerBorder }}>
                <Button
                  onClick={handleClose}
                  className="flex-1 h-12 border-none"
                  disabled={isSaving}
                  style={{
                    backgroundColor: colors.buttonSecondary,
                    color: colors.buttonSecondaryText
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 h-12 border-none"
                  disabled={isSaving || (duration === 0 && !isRecording)}
                  style={{
                    backgroundColor: (duration > 0 || isRecording) && !isSaving ? colors.buttonSuccess : colors.textMuted,
                    color: colors.buttonSuccessText
                  }}
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
