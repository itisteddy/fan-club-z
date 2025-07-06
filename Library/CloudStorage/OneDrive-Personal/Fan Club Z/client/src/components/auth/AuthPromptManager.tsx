import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useAuthPrompt, AuthPrompt } from './AuthPrompt'

interface AuthPromptManagerProps {
  children: React.ReactNode
}

// Configuration for auth prompt triggers
const AUTH_PROMPT_CONFIG = {
  viewThreshold: 3, // Show prompt after viewing 3+ bet details
  timeThreshold: 120, // Show prompt after 2 minutes of active browsing
  actions: ['PLACE_BET', 'SAVE_BET', 'JOIN_CLUB', 'VIEW_ANALYTICS'],
  returnVisitor: true, // Show prompt for return visitors
}

export const AuthPromptManager: React.FC<AuthPromptManagerProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  const authPrompt = useAuthPrompt()
  
  const viewCount = useRef(0)
  const startTime = useRef(Date.now())
  const lastActivity = useRef(Date.now())
  const hasShownTimePrompt = useRef(false)
  const hasShownReturnPrompt = useRef(false)

  // Check if user is a return visitor
  useEffect(() => {
    if (!isAuthenticated && AUTH_PROMPT_CONFIG.returnVisitor) {
      const lastVisit = localStorage.getItem('last_visit')
      const isReturnVisitor = lastVisit && (Date.now() - parseInt(lastVisit)) > 24 * 60 * 60 * 1000 // 24 hours
      
      if (isReturnVisitor && !hasShownReturnPrompt.current) {
        setTimeout(() => {
          authPrompt.showAuthPrompt(
            { 
              action: 'general',
              incentive: 'Welcome back! Get $10 free credit to continue betting!'
            },
            'return_visitor'
          )
          hasShownReturnPrompt.current = true
        }, 5000) // Show after 5 seconds
      }
      
      // Update last visit
      localStorage.setItem('last_visit', Date.now().toString())
    }
  }, [isAuthenticated, authPrompt])

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivity.current = Date.now()
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })
    }
  }, [])

  // Time-based prompt
  useEffect(() => {
    if (!isAuthenticated && !hasShownTimePrompt.current) {
      const timer = setTimeout(() => {
        const timeSinceStart = Date.now() - startTime.current
        const timeSinceActivity = Date.now() - lastActivity.current
        
        // Show prompt if user has been active for 2+ minutes and hasn't been active for 30+ seconds
        if (timeSinceStart > AUTH_PROMPT_CONFIG.timeThreshold * 1000 && 
            timeSinceActivity > 30 * 1000) {
          authPrompt.showAuthPrompt(
            { 
              action: 'general',
              incentive: 'You\'ve been browsing for a while! Get $10 free credit to start betting!'
            },
            'time'
          )
          hasShownTimePrompt.current = true
        }
      }, AUTH_PROMPT_CONFIG.timeThreshold * 1000)

      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, authPrompt])

  // Track bet view count
  const trackBetView = (betId: string) => {
    if (!isAuthenticated) {
      viewCount.current += 1
      
      // Show prompt after viewing 3+ bets
      if (viewCount.current >= AUTH_PROMPT_CONFIG.viewThreshold && !hasShownTimePrompt.current) {
        authPrompt.showAuthPrompt(
          { 
            action: 'place_bet',
            incentive: 'You\'ve viewed several bets! Get $10 free credit to start betting!'
          },
          'view_threshold'
        )
        hasShownTimePrompt.current = true
      }
    }
  }

  // Expose tracking function to child components
  const managerRef = useRef<{
    trackBetView: (betId: string) => void
    showAuthPrompt: typeof authPrompt.showAuthPrompt
  }>(null)

  React.useImperativeHandle(managerRef, () => ({
    trackBetView,
    showAuthPrompt: authPrompt.showAuthPrompt
  }))

  return (
    <>
      {children}
      <AuthPrompt
        isOpen={authPrompt.isOpen}
        onClose={authPrompt.hideAuthPrompt}
        context={authPrompt.context}
        trigger={authPrompt.trigger}
      />
    </>
  )
}

export default AuthPromptManager 