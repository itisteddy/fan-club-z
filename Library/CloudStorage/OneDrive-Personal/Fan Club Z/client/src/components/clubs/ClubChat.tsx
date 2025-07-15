import React, { useState, useEffect, useRef } from 'react'
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical,
  Users,
  Phone,
  Video,
  Search,
  Settings,
  Info
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/use-toast'
import { formatRelativeTime, cn } from '../../lib/utils'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import MembersList from './MembersList'
import type { User } from '@shared/schema'

interface ChatMessage {
  id: string
  clubId: string
  userId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  createdAt: string
  user: User
  reactions?: { [emoji: string]: string[] } // user IDs who reacted
  replyTo?: string // message ID being replied to
}

interface ClubChatProps {
  clubId: string
  clubName: string
  members: any[]
  onClose?: () => void
  isFullScreen?: boolean
}

export const ClubChat: React.FC<ClubChatProps> = ({
  clubId,
  clubName,
  members,
  onClose,
  isFullScreen = false
}) => {
  const { user } = useAuthStore()
  const { success, error } = useToast()
  
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineMembers, setOnlineMembers] = useState<string[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ws, setWs] = useState<WebSocket | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user) return

    const connectWebSocket = () => {
      const token = localStorage.getItem('accessToken')
      const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3001'}/ws/clubs/${clubId}/chat?token=${token}`
      
      console.log('🔗 Connecting to club chat WebSocket:', wsUrl)
      
      const websocket = new WebSocket(wsUrl)
      
      websocket.onopen = () => {
        console.log('✅ Club chat WebSocket connected')
        setWs(websocket)
        
        // Send join message
        websocket.send(JSON.stringify({
          type: 'join',
          clubId,
          userId: user.id
        }))
      }
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('📨 Received chat message:', data)
        
        switch (data.type) {
          case 'message':
            setMessages(prev => [...prev, data.message])
            break
          case 'typing':
            if (data.userId !== user.id) {
              setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId])
            }
            break
          case 'stop-typing':
            setTypingUsers(prev => prev.filter(id => id !== data.userId))
            break
          case 'user-online':
            setOnlineMembers(prev => [...new Set([...prev, data.userId])])
            break
          case 'user-offline':
            setOnlineMembers(prev => prev.filter(id => id !== data.userId))
            break
          case 'online-members':
            setOnlineMembers(data.members)
            break
        }
      }
      
      websocket.onclose = () => {
        console.log('❌ Club chat WebSocket disconnected')
        setWs(null)
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
      
      websocket.onerror = (error) => {
        console.error('❌ Club chat WebSocket error:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [clubId, user])

  // Load chat history
  useEffect(() => {
    loadChatHistory()
  }, [clubId])

  const loadChatHistory = async () => {
    try {
      setLoading(true)
      
      // For demo purposes, load mock chat data
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          clubId: clubId,
          userId: 'demo-user-id',
          content: 'Hey everyone! Welcome to our club chat 👋',
          type: 'text',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          user: {
            id: 'demo-user-id',
            firstName: 'Demo',
            lastName: 'User',
            username: 'demo_user',
            email: 'demo@fanclubz.app',
            phone: '+1 (555) 123-4567',
            bio: 'Demo account',
            profileImage: null,
            walletAddress: '0xDemo',
            kycLevel: 'verified',
            walletBalance: 2500,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        },
        {
          id: 'msg-2',
          clubId: clubId,
          userId: 'user-1',
          content: 'Great to be here! Looking forward to some exciting bets 🎯',
          type: 'text',
          createdAt: new Date(Date.now() - 3000000).toISOString(),
          user: {
            id: 'user-1',
            firstName: 'Alex',
            lastName: 'Johnson',
            username: 'alexj',
            email: 'alex@example.com',
            phone: '+1 (555) 987-6543',
            bio: 'Sports enthusiast',
            profileImage: null,
            walletAddress: '0xAlex',
            kycLevel: 'verified',
            walletBalance: 1200,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        },
        {
          id: 'msg-3',
          clubId: clubId,
          userId: 'demo-user-id',
          content: 'Don\'t forget to check out the new bet I just created about the upcoming match!',
          type: 'text',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          user: {
            id: 'demo-user-id',
            firstName: 'Demo',
            lastName: 'User',
            username: 'demo_user',
            email: 'demo@fanclubz.app',
            phone: '+1 (555) 123-4567',
            bio: 'Demo account',
            profileImage: null,
            walletAddress: '0xDemo',
            kycLevel: 'verified',
            walletBalance: 2500,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      ]
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setMessages(mockMessages)
    } catch (err) {
      console.error('Failed to load chat history:', err)
      error('Failed to load chat history')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!user || !ws || !content.trim()) return

    const messageData = {
      type: 'message',
      clubId,
      content: content.trim(),
      messageType: type,
      userId: user.id
    }

    try {
      // Send via WebSocket
      ws.send(JSON.stringify(messageData))
      
      // Clear input
      setNewMessage('')
      
      // Stop typing indicator
      handleStopTyping()
      
    } catch (err) {
      console.error('Failed to send message:', err)
      error('Failed to send message')
    }
  }

  const handleTyping = () => {
    if (!ws || !user) return

    setIsTyping(true)
    
    // Send typing indicator
    ws.send(JSON.stringify({
      type: 'typing',
      clubId,
      userId: user.id
    }))

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping()
    }, 3000)
  }

  const handleStopTyping = () => {
    if (!ws || !user || !isTyping) return

    setIsTyping(false)
    
    ws.send(JSON.stringify({
      type: 'stop-typing',
      clubId,
      userId: user.id
    }))

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const getTypingText = () => {
    if (typingUsers.length === 0) return ''
    
    const typingNames = typingUsers
      .map(userId => members.find(m => m.userId === userId)?.user?.firstName || 'Someone')
      .slice(0, 3)
    
    if (typingNames.length === 1) {
      return `${typingNames[0]} is typing...`
    } else if (typingNames.length === 2) {
      return `${typingNames[0]} and ${typingNames[1]} are typing...`
    } else {
      return `${typingNames[0]}, ${typingNames[1]} and ${typingUsers.length - 2} others are typing...`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden",
      isFullScreen ? "h-screen" : "h-96"
    )}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            {onlineMembers.length > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border border-white rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{clubName}</h3>
            <p className="text-xs text-gray-500">
              {onlineMembers.length} online • {members.length} members
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMembers(!showMembers)}
            className="p-2"
          >
            <Users className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="sm" className="p-2">
            <Search className="w-4 h-4" />
          </Button>
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              ×
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => {
                const showAvatar = index === 0 || messages[index - 1].userId !== message.userId
                const isConsecutive = index > 0 && messages[index - 1].userId === message.userId
                
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    showAvatar={showAvatar}
                    isConsecutive={isConsecutive}
                    isOwnMessage={message.userId === user?.id}
                  />
                )
              })}
              
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>{getTypingText()}</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <ChatInput
            value={newMessage}
            onChange={setNewMessage}
            onSend={sendMessage}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
            placeholder={`Message ${clubName}...`}
            disabled={!ws}
          />
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-gray-200 bg-gray-50">
            <MembersList
              members={members}
              onlineMembers={onlineMembers}
              currentUserId={user?.id}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ClubChat