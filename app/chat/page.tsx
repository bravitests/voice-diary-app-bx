"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
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
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(0)
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadingMessages = [
    "Fetching your diary entries...",
    "Analyzing your thoughts...",
    "Preparing personalized insights...",
    "Setting up your AI companion...",
    "Almost ready to chat!"
  ]

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

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

    setIsSettingUp(true)
    setLoadingMessage(0)
    
    // Rotate loading messages
    const messageInterval = setInterval(() => {
      setLoadingMessage(prev => (prev + 1) % loadingMessages.length)
    }, 1000)

    try {
      // First, check if there's an existing session
      const existingSessionResponse = await fetch(`/api/chat/sessions?userId=${user.id}&purposeId=${selectedPurpose}`)
      
      if (existingSessionResponse.ok) {
        const { session } = await existingSessionResponse.json()
        
        if (session && session.messages.length > 0) {
          // Use existing session and messages
          setSessionId(session.id)
          setMessages(session.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at
          })))
          return
        }
      }

      // Create new session if no existing one found
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
    } finally {
      clearInterval(messageInterval)
      setIsSettingUp(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedPurpose || !user || !sessionId) return

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
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Fixed at top */}
      <header className="flex-shrink-0 px-4 py-4 border-b border-border bg-background">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push("/dashboard")} 
              className="h-9 w-9 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Chat with Your Diary</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      {/* Purpose Header - Only show when purpose is selected and not setting up */}
      {selectedPurpose && !isSettingUp && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <Select 
              value={selectedPurpose} 
              onValueChange={(value) => {
                setSelectedPurpose(value)
                setMessages([])
                setSessionId(null)
              }}
            >
              <SelectTrigger className="w-full max-w-xs bg-background border-border h-10">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getPurposeInfo(selectedPurpose).color }} />
                  <SelectValue>
                    <span className="font-medium">{getPurposeInfo(selectedPurpose).name}</span>
                  </SelectValue>
                </div>
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
          </div>
        </div>
      )}

      {/* Main Content Area - Flexible */}
      <main className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 px-4">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {!selectedPurpose ? (
              /* Purpose Selection */
              <div className="flex-1 flex items-center justify-center py-8">
                <Card className="border-border bg-card w-full max-w-md">
                  <CardContent className="p-8 space-y-6 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold text-card-foreground">Choose a Topic</h2>
                      <p className="text-muted-foreground leading-relaxed">
                        Select a purpose to chat about your related diary entries and get personalized insights.
                      </p>
                    </div>
                    <Select value={selectedPurpose} onValueChange={setSelectedPurpose}>
                      <SelectTrigger className="bg-background border-border h-12">
                        <SelectValue placeholder="Choose a purpose to discuss" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingPurposes ? (
                          <div className="flex items-center justify-center py-4">
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
            ) : isSettingUp ? (
              /* Setting Up */
              <div className="flex-1 flex items-center justify-center py-8">
                <Card className="border-border bg-card w-full max-w-md">
                  <CardContent className="p-8 space-y-6 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                    <div className="space-y-3">
                      <h2 className="text-xl font-semibold text-card-foreground">Setting up your chat</h2>
                      <p className="text-muted-foreground">
                        {loadingMessages[loadingMessage]}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Chat Messages */
              <div className="flex-1 min-h-0 py-4 pb-20">
                <ScrollArea className="h-full">
                  <div className="space-y-6 pb-4">
                    {messages.map((message) => {
                      const isLongMessage = message.role === "user" && message.content.length > 150
                      const isExpanded = expandedMessages.has(message.id)
                      const displayContent = isLongMessage && !isExpanded 
                        ? message.content.substring(0, 150) + "..."
                        : message.content

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.role === "assistant" && (
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <Bot className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-card border border-border text-card-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
                            {isLongMessage && (
                              <button
                                onClick={() => toggleMessageExpansion(message.id)}
                                className={`text-xs mt-2 underline hover:no-underline transition-all ${
                                  message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                                }`}
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            )}
                            <p
                              className={`text-xs mt-2 ${
                                message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                              }`}
                            >
                              {new Date(message.created_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </p>
                          </div>
                          {message.role === "user" && (
                            <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {isTyping && (
                      <div className="flex gap-4 justify-start">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
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
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Input Area - Fixed above bottom nav */}
      {selectedPurpose && !isSettingUp && (
        <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm p-4 z-10">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your entries..."
              className="flex-1 bg-background border-border h-12 text-base"
              disabled={isTyping}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              size="lg"
              className="px-6 h-12"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}