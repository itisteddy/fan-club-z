import React, { useState, useEffect, useRef } from 'react'
import { 
  Users,
  Phone,
  Video,
  Search,
  Settings,
  Info,
  X,
  MessageCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/use-toast'
import { formatRelativeTime, cn } from '../../lib/utils'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import MembersList from './MembersList'
import type { User } from '@shared/schema'

interface ClubChatMessage {
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
  const [messages, setMessages] = useState<ClubChatMessage[]>([])
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
      const mockMessages: ClubChatMessage[] = [
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
          },
          reactions: {
            '👋': ['user-1', 'user-2'],
            '🎉': ['user-1']
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
          },
          reactions: {
            '💯': ['demo-user-id', 'user-2']
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
      setOnlineMembers(['demo-user-id', 'user-1', 'user-2'])
    } catch (err) {
      console.error('Failed to load chat history:', err)
      error('Failed to load chat history')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (content: string, type: 'text' | 'image' | 'file' = 'text') => {
    console.log('📤 ClubChat: sendMessage called with:', { content, type, hasUser: !!user })
    
    if (!user || !content.trim()) {
      console.log('❌ ClubChat: Cannot send message - missing user or content')
      return
    }

    console.log('📤 ClubChat: Processing message send for:', content.trim())

    // Create a temporary message for immediate display
    const tempMessage: ClubChatMessage = {
      id: `temp-${Date.now()}`,
      clubId,
      content: content.trim(),
      type,
      userId: user.id,
      createdAt: new Date().toISOString(),
      user
    }

    console.log('📥 ClubChat: Adding message to state:', tempMessage)
    
    // Add to messages immediately for better UX
    setMessages(prev => {
      const newMessages = [...prev, tempMessage]
      console.log('📥 ClubChat: Updated messages count:', newMessages.length)
      return newMessages
    })

    // Stop typing indicator
    handleStopTyping()

    try {
      // In a real app, send via WebSocket or API
      if (ws && ws.readyState === WebSocket.OPEN) {
        const messageData = {
          type: 'message',
          clubId,
          content: content.trim(),
          messageType: type,
          userId: user.id
        }
        ws.send(JSON.stringify(messageData))
        console.log('📤 ClubChat: Message sent via WebSocket')
      } else {
        console.log('📤 ClubChat: WebSocket not connected, message sent locally only')
      }
    } catch (err) {
      console.error('❌ ClubChat: Failed to send message:', err)
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
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

  const handleReaction = (messageId: string, emoji: string) => {
    console.log('😀 ClubChat: Reaction added:', emoji, 'to message:', messageId)
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions }
        if (reactions[emoji]) {
          if (reactions[emoji].includes(user?.id || '')) {
            // Remove reaction
            reactions[emoji] = reactions[emoji].filter(id => id !== user?.id)
            if (reactions[emoji].length === 0) {
              delete reactions[emoji]
            }
          } else {
            // Add reaction
            reactions[emoji] = [...reactions[emoji], user?.id || '']
          }
        } else {
          // New reaction
          reactions[emoji] = [user?.id || '']
        }
        return { ...msg, reactions }
      }
      return msg
    }))
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
      <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm w-full max-w-full relative isolate",
        isFullScreen ? "h-screen" : "h-[calc(100vh-120px)] min-h-[500px]"
      )}
      style={{ maxWidth: '100vw', position: 'relative', zIndex: 1 }}
      onClickCapture={(e) => {
        // Capture clicks to prevent any unwanted navigation
        console.log('🔍 ClubChat: Click captured in chat container')
      }}
    >
      {/* Chat Header */}
      <div 
        className="flex items-center justify-between p-2 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0"
        onClick={(e) => {
          // Prevent any header clicks from bubbling up to potential parent navigation handlers
          e.stopPropagation()
        }}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            {onlineMembers.length > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{onlineMembers.length}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{clubName}</h3>
            <p className="text-xs text-gray-500 truncate">
              {onlineMembers.length} online • {members.length} members
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Video Call Button */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-white/60 rounded-xl h-8 w-8"
          >
            <Video className="w-4 h-4 text-gray-600" />
          </Button>

          {/* Phone Call Button */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-white/60 rounded-xl h-8 w-8"
          >
            <Phone className="w-4 h-4 text-gray-600" />
          </Button>
          
          {/* Members Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation() 
              e.nativeEvent.stopImmediatePropagation()
              console.log('🔍 ClubChat: Members button clicked, current state:', showMembers)
              console.log('🔍 ClubChat: Event details:', {
                type: e.type,
                target: e.target,
                currentTarget: e.currentTarget,
                bubbles: e.bubbles
              })
              setShowMembers(!showMembers)
              console.log('🔍 ClubChat: Members state after click:', !showMembers)
            }}
            className={`p-2 hover:bg-white/60 rounded-xl h-8 w-8 transition-colors ${
              showMembers ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
            }`}
          >
            <Users className="w-4 h-4" />
          </Button>
          
          {/* Close Button */}
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="p-2 hover:bg-white/60 rounded-xl h-8 w-8"
            >
              <X className="w-4 h-4 text-gray-600" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50/30 w-full pb-4">
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
              {messages.map((message, index) => {
                const showAvatar = index === 0 || messages[index - 1].userId !== message.userId
                const isConsecutive = index > 0 && messages[index - 1].userId === message.userId
                
                return (
                  <div key={message.id} className="w-full px-2 py-0.5">
                    <ChatMessage
                      message={message}
                      showAvatar={showAvatar}
                      isConsecutive={isConsecutive}
                      isOwnMessage={(() => {
                        const isOwn = message.userId === user?.id
                        console.log('🔍 ChatMessage Debug:', {
                          messageId: message.id,
                          messageUserId: message.userId,
                          currentUserId: user?.id,
                          isOwnMessage: isOwn,
                          messageContent: message.content.substring(0, 30)
                        })
                        return isOwn
                      })()}
                      onReply={(msg) => {
                        console.log('💬 ClubChat: Reply requested for message:', msg.id)
                        alert(`Reply to: "${msg.content.substring(0, 50)}..."`)
                      }}
                      onReact={handleReaction}
                      onDelete={(messageId) => {
                        console.log('🗑️ ClubChat: Delete requested for message:', messageId)
                        setMessages(prev => {
                          const filtered = prev.filter(msg => msg.id !== messageId)
                          console.log('🗑️ ClubChat: Message deleted, remaining count:', filtered.length)
                          return filtered
                        })
                      }}
                      onReport={(messageId) => {
                        console.log('🚩 ClubChat: Report requested for message:', messageId)
                        alert('Message reported successfully. Thank you for helping keep our community safe.')
                      }}
                    />
                  </div>
                )
              })}
              
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="w-full px-2 py-0.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7" /> {/* Avatar spacer */}
                    <div className="flex items-center space-x-2 bg-white border border-gray-100 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm max-w-xs">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-gray-500 truncate">{getTypingText()}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 w-full">
            <ChatInput
              value={newMessage}
              onChange={(value) => {
                console.log('ClubChat: Input changed to:', value)
                setNewMessage(value)
              }}
              onSend={(content, type) => {
                console.log('ClubChat: Received send request for:', content)
                sendMessage(content, type)
              }}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
              placeholder={`Message ${clubName}...`}
              disabled={false}
              showAttachments={true}
            />
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <>
            {/* Backdrop - only covers chat area */}
            <div 
              className="absolute inset-0 bg-black/20 z-40" 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🔙 ClubChat: Backdrop clicked, closing members sidebar')
                setShowMembers(false)
              }}
            />
            
            {/* Sidebar - positioned within chat container */}
            <div 
              className="absolute top-0 right-0 h-full w-64 bg-gradient-to-b from-gray-50 to-white shadow-xl z-50 border-l border-gray-200"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🔍 ClubChat: Members sidebar clicked, preventing close')
              }}
            >
              <div className="h-full">
                <MembersList
                  members={members}
                  onlineMembers={onlineMembers}
                  currentUserId={user?.id}
                  onMemberClick={(member) => {
                    console.log('👥 ClubChat: Member clicked:', member.user.firstName)
                    // Handle member click (e.g., show profile)
                  }}
                  onDirectMessage={(member) => {
                    console.log('💬 ClubChat: Direct message to:', member.user.firstName)
                    alert(`Starting direct message with ${member.user.firstName}...`)
                  }}
                  onCall={(member) => {
                    console.log('📞 ClubChat: Voice call to:', member.user.firstName)
                    alert(`Starting voice call with ${member.user.firstName}...`)
                  }}
                  onVideoCall={(member) => {
                    console.log('📹 ClubChat: Video call to:', member.user.firstName)
                    alert(`Starting video call with ${member.user.firstName}...`)
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ClubChat