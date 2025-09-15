"use client"

import { useState, useEffect } from "react"
import { LoginScreen } from "./login-screen"
import { ChatInterface } from "./chat-interface"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function AuthWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = () => {
      const authStatus = localStorage.getItem('isAuthenticated')
      const loginTimestamp = localStorage.getItem('loginTimestamp')
      
      if (authStatus === 'true' && loginTimestamp) {
        // Check if login is still valid (24 hours)
        const loginTime = parseInt(loginTimestamp)
        const currentTime = Date.now()
        const twentyFourHours = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        
        if (currentTime - loginTime < twentyFourHours) {
          setIsAuthenticated(true)
        } else {
          // Login expired, clear storage
          handleLogout()
        }
      }
      
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAuthenticated(true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('loginTimestamp')
    setIsAuthenticated(false)
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // Show main interface with logout button if authenticated
  return (
    <div className="h-full relative">
      {/* Logout button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      
      {/* Main chat interface */}
      <ChatInterface />
    </div>
  )
}
