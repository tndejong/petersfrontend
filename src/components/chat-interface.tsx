"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Send, MessageSquare, User, Bot, Trash2, Info, CheckCircle, AlertCircle, Settings, Menu, X } from "lucide-react"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  lastResponseId?: string // Track the last response ID for conversation continuity
}

interface ConfigInfo {
  isConfigured: boolean
  hasAssistant: boolean
  hasVectorStores: boolean
  apiMode: string
  details: {
    apiKey: string
    model: string
    assistantId: string
    organizationId: string
    vectorStores: string
    status: string
  }
  recommendations: string[]
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      role: "assistant",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState("")
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "New Chat",
      messages: [],
      createdAt: new Date()
    }
  ])
  const [currentSessionId, setCurrentSessionId] = useState("1")
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [configInfo, setConfigInfo] = useState<ConfigInfo | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessageToOpenAI = async (
    conversationMessages: Message[], 
    updateStatus?: (status: string) => void,
    previousResponseId?: string
  ): Promise<{message: string, responseId?: string}> => {
    try {
      updateStatus?.("📤 Sending message to AI...")
      
      const requestBody: any = {
        messages: conversationMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }

      // Include previous response ID for conversation continuity with Response API
      if (previousResponseId) {
        requestBody.previousResponseId = previousResponseId
        console.log('🔗 Continuing conversation with Response ID:', previousResponseId)
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      updateStatus?.("⏳ AI is thinking...")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response from AI')
      }

      updateStatus?.("🔄 Processing AI response...")
      const data = await response.json()
      
      // Log which API mode was used
      if (data.apiMode === 'response_api') {
        console.log('✅ Response from Response API (using OpenAI SDK)')
        if (data.hasFileSearch) {
          updateStatus?.("🔍 Response API with file search responded!")
        } else {
          updateStatus?.("🚀 Response API responded!")
        }
      } else {
        console.log('💬 Unexpected API mode:', data.apiMode)
        updateStatus?.("💬 AI responded!")
      }
      
      // Small delay to show the final status
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return {
        message: data.message || 'I apologize, but I couldn\'t generate a response at the moment.',
        responseId: data.responseId // Store response ID for future requests
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      updateStatus?.("❌ Error occurred, please try again...")
      
      // Fallback to a simple error message
      if (error instanceof Error) {
        return {
          message: `I'm sorry, I'm having trouble connecting right now. Error: ${error.message}`
        }
      }
      
      return {
        message: "I'm sorry, I'm experiencing technical difficulties. Please try again later."
      }
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setLoadingStatus("📝 Preparing your message...")

    // Update chat title if this is the first user message
    const currentSession = chatSessions.find(s => s.id === currentSessionId)
    if (currentSession && currentSession.title === "New Chat" && messages.length <= 1) {
      const newTitle = userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? "..." : "")
      setChatSessions(prev => 
        prev.map(session => 
          session.id === currentSessionId 
            ? { ...session, title: newTitle }
            : session
        )
      )
    }

    try {
      // Get AI response from OpenAI
      setLoadingStatus("🔗 Connecting to AI...")
      const updatedMessages = [...messages, userMessage]
      
      // Get the current session's last response ID for conversation continuity
      const currentSession = chatSessions.find(s => s.id === currentSessionId)
      const previousResponseId = currentSession?.lastResponseId
      
      const aiResponseData = await sendMessageToOpenAI(
        updatedMessages, 
        setLoadingStatus, 
        previousResponseId
      )
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseData.message,
        role: "assistant",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
      setLoadingStatus("")

      // Update the current session with the new messages and response ID
      setChatSessions(prev => 
        prev.map(session => 
          session.id === currentSessionId 
            ? { 
                ...session, 
                messages: [...updatedMessages, assistantMessage],
                lastResponseId: aiResponseData.responseId // Store the response ID for next message
              }
            : session
        )
      )
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble responding right now. Please try again.",
        role: "assistant",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
      setLoadingStatus("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [{
        id: "1",
        content: "Hello! I'm your AI assistant. How can I help you today?",
        role: "assistant",
        timestamp: new Date()
      }],
      createdAt: new Date()
    }
    
    setChatSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    setMessages(newSession.messages)
    setShowMobileSidebar(false) // Close mobile sidebar when creating new chat
  }

  const selectChatSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
      setMessages(session.messages)
      setShowMobileSidebar(false) // Close mobile sidebar when selecting a chat
    }
  }

  const deleteChatSession = (sessionId: string) => {
    // Don't allow deleting if it's the only session
    if (chatSessions.length <= 1) {
      return
    }

    // Remove the session from the list
    const updatedSessions = chatSessions.filter(s => s.id !== sessionId)
    setChatSessions(updatedSessions)

    // If we're deleting the current session, switch to the first available session
    if (currentSessionId === sessionId) {
      const newCurrentSession = updatedSessions[0]
      setCurrentSessionId(newCurrentSession.id)
      setMessages(newCurrentSession.messages)
    }

    setDeletingSessionId(null)
  }

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selecting the chat when clicking delete
    setDeletingSessionId(sessionId)
  }

  const fetchConfigInfo = async () => {
    setLoadingConfig(true)
    try {
      const response = await fetch('/api/config')
      if (response.ok) {
        const config = await response.json()
        setConfigInfo(config)
      } else {
        console.error('Failed to fetch config info')
      }
    } catch (error) {
      console.error('Error fetching config info:', error)
    } finally {
      setLoadingConfig(false)
    }
  }

  const handleShowConfig = () => {
    setShowConfigDialog(true)
    if (!configInfo) {
      fetchConfigInfo()
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-[5] md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`w-64 min-w-64 max-w-64 bg-muted/30 border-r border-border fixed left-0 top-0 h-full z-20 transition-transform duration-300 ease-in-out md:translate-x-0 ${
        showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } md:block flex flex-col overflow-hidden`}>
        {/* Header with New Chat button */}
        <div className="p-3 border-b border-border/50 shrink-0">
          <Button 
            onClick={startNewChat}
            className="w-full" 
            variant="outline"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        {/* Chat Sessions List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-3 py-3">
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 relative group w-full min-w-0 box-border rounded-lg ${
                  currentSessionId === session.id ? "bg-muted" : ""
                }`}
                onClick={() => selectChatSession(session.id)}
              >
                <div className="text-sm font-medium pr-8 w-full leading-tight break-words line-clamp-2">
                  {session.title}
                </div>
                <div className="text-xs text-muted-foreground truncate w-full overflow-hidden whitespace-nowrap mt-1">
                  {session.createdAt.toLocaleDateString()}
                </div>
                
                {/* Delete button - only show if there's more than one session */}
                {chatSessions.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background/90"
                    onClick={(e) => handleDeleteClick(session.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                size="sm" 
                variant="ghost"
                className="h-8 w-8 p-0 md:hidden"
              >
                {showMobileSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <h1 className="text-xl font-semibold">Peter&apos;s AI Assistant</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleShowConfig}
                size="sm" 
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button 
                onClick={startNewChat}
                size="sm" 
                variant="outline"
                className="md:hidden"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2 max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">
                      {loadingStatus || "Thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Info Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              OpenAI Configuration
            </DialogTitle>
            <DialogDescription>
              Current API configuration and credentials status
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingConfig ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : configInfo ? (
              <>
                {/* Status Alert */}
                <Alert className={configInfo.isConfigured ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                  <div className="flex items-center gap-2">
                    {configInfo.isConfigured ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <AlertTitle>{configInfo.details.status}</AlertTitle>
                  </div>
                  <AlertDescription className="mt-2">
                    <strong>API Mode:</strong> {configInfo.apiMode}
                  </AlertDescription>
                </Alert>

                {/* Configuration Details */}
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">API Key</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {configInfo.details.apiKey}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Model</h4>
                      <p className="text-sm text-muted-foreground">
                        {configInfo.details.model}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Assistant ID</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {configInfo.details.assistantId}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Organization</h4>
                      <p className="text-sm text-muted-foreground">
                        {configInfo.details.organizationId}
                      </p>
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <span>Vector Stores</span>
                        {configInfo.hasVectorStores && <span className="text-green-600">🔍</span>}
                      </h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {configInfo.details.vectorStores}
                      </p>
                      {configInfo.hasVectorStores && (
                        <p className="text-xs text-green-600">
                          File search enabled - your assistant can search uploaded documents
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {configInfo.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recommendations</h4>
                      <div className="space-y-1">
                        {configInfo.recommendations.map((rec, index) => (
                          <p key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {rec}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Refresh Button */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Configuration checked from environment variables
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchConfigInfo}
                    disabled={loadingConfig}
                  >
                    Refresh
                  </Button>
                </div>
              </>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load configuration information. Check console for details.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingSessionId !== null} onOpenChange={() => setDeletingSessionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingSessionId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSessionId && deleteChatSession(deletingSessionId)}
            >
              Delete Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
