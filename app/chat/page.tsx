"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BookOpen,
  MessageCircle,
  User,
  Loader2,
  Sparkles,
  Target,
  Heart,
  Briefcase,
  Users,
  ArrowLeft,
  Send,
  Bot,
} from "lucide-react"


interface Purpose {
  id: string
  name: string
  color: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export default function ChatPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [selectedPurpose, setSelectedPurpose] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [loadingPurposes, setLoadingPurposes] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.walletAddress) {
      fetchPurposes()
    }
  }, [user])

  const fetchPurposes = async () => {
    try {
      const response = await fetch(`/api/purposes?wallet_address=${user?.walletAddress}`)
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

  useEffect(() => {
    if (selectedPurpose && user) {
      initializeChat()
    }
  }, [selectedPurpose, user])

  const initializeChat = async () => {
    if (!user || !selectedPurpose) return

    try {
      const response = await fetch("/api/chat/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          purpose: selectedPurpose,
          title: `${purposes.find((p) => p.id === selectedPurpose)?.name} Chat`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create chat session")
      }

      const { sessionId: newSessionId } = await response.json()
      setSessionId(newSessionId)

      // Initialize with welcome message
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: `Hi ${user.name || "there"}! I'm here to help you explore insights from your ${purposes.find((p) => p.id === selectedPurpose)?.name.toLowerCase()} entries. What would you like to discuss?`,
        created_at: new Date().toISOString(),
      }
      setMessages([welcomeMessage])
    } catch (error) {
      console.error("Error initializing chat:", error)
      alert("Failed to start chat session. Please try again.")
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedPurpose || !user || !sessionId) return

    // Usage limits will be checked on the server side in the API route

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsTyping(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          purpose: selectedPurpose,
          userId: user.id,
          sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const data = await response.json()

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiResponse])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble processing your message right now. Please try again in a moment.",
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getPurposeInfo = (purposeId: string) => {
    return purposes.find((p) => p.id === purposeId) || { name: "Unknown", color: "#cdb4db" }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Chat with Your Diary</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <MessageCircle className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-md mx-auto h-full flex flex-col">
          {!selectedPurpose ? (
            /* Purpose Selection */
            <div className="flex-1 flex items-center justify-center">
              <Card className="border-border bg-card w-full">
                <CardContent className="p-6 space-y-4 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-card-foreground">Choose a Topic</h2>
                    <p className="text-sm text-muted-foreground">
                      Select a purpose to chat about your related diary entries and get personalized insights.
                    </p>
                  </div>
                  <Select value={selectedPurpose} onValueChange={setSelectedPurpose}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Choose a purpose to discuss" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingPurposes ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        purposes.map((purpose) => (
                          <SelectItem key={purpose.id} value={purpose.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: purpose.color }} />
                              {purpose.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Chat Interface */
            <>
              {/* Purpose Header */}
              <Card className="border-border bg-card mb-4">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${getPurposeInfo(selectedPurpose).color}20` }}>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getPurposeInfo(selectedPurpose).color }} />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{getPurposeInfo(selectedPurpose).name}</p>
                      <p className="text-xs text-muted-foreground">AI insights from your entries</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPurpose("")
                        setMessages([])
                        setSessionId(null)
                      }}
                      className="ml-auto text-xs"
                    >
                      Change Topic
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-card-foreground"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-primary">AI Assistant</span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p
                          className={`text-xs mt-2 ${
                            message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-primary">AI Assistant</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your entries..."
                  className="flex-1 bg-background border-border"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          
        </div>
      </main>
    </div>
  )
}
