import React, { useState, useEffect, useRef } from 'react'
import { 
  MoreHorizontal, 
  Reply, 
  Copy, 
  Trash2, 
  Flag,
  Check,
  Heart
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { formatRelativeTime } from '../../lib/utils'
import type { User } from '@shared/schema'

interface ClubChatMessage {
  id: string
  clubId: string
  userId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  createdAt: string
  user: User
  reactions?: { [emoji: string]: string[] }
  replyTo?: string
}

interface ChatMessageProps {
  message: ClubChatMessage
  showAvatar: boolean
  isConsecutive: boolean
  isOwnMessage: boolean
  onReply?: (message: ClubChatMessage) => void
  onReact?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
  onReport?: (messageId: string) => void
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  showAvatar,
  isConsecutive,
  isOwnMessage,
  onReply,
  onReact,
  onDelete,
  onReport
}) => {
  const [showActions, setShowActions] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  // Quick reaction emojis - Updated to match UI
  const quickEmojis = ['❤️', '👍', '😂', '😱', '😢']

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false)
      }
    }

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showActions])

  const handleCopyMessage = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message.content)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = message.content
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      setCopySuccess(true)
      setShowActions(false)
      setTimeout(() => setCopySuccess(false), 2000)
      
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const handleReply = () => {
    console.log('ChatMessage: Reply clicked for message:', message.id)
    if (onReply) {
      onReply(message)
    }
    setShowActions(false)
  }

  const handleReaction = (emoji: string) => {
    console.log('ChatMessage: Reaction clicked:', emoji, 'for message:', message.id)
    if (onReact) {
      onReact(message.id, emoji)
    }
    setShowActions(false)
  }

  const handleDelete = () => {
    if (!isOwnMessage) return

    const confirmed = window.confirm('Are you sure you want to delete this message?')
    if (confirmed && onDelete) {
      onDelete(message.id)
    }
    setShowActions(false)
  }

  const handleReport = () => {
    if (isOwnMessage) return

    const confirmed = window.confirm('Are you sure you want to report this message?')
    if (confirmed && onReport) {
      onReport(message.id)
    }
    setShowActions(false)
  }

  // Handle message tap/click - Fixed with proper event handling
  const handleMessageClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('ChatMessage: Message clicked, current showActions:', showActions)
    
    // Don't interfere with text selection
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      console.log('ChatMessage: Text is selected, not showing menu')
      return
    }

    console.log('ChatMessage: Toggling actions menu')
    setShowActions(!showActions)
  }

  return (
    <div className="px-4 py-3 hover:bg-gray-50/30 rounded-lg transition-colors">
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {showAvatar ? (
            <Avatar className="w-9 h-9 border-2 border-white shadow-sm">
              <AvatarImage src={message.user.profileImage || undefined} />
              <AvatarFallback className="text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                {message.user.firstName.charAt(0)}{message.user.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 relative">
          {/* User name and timestamp */}
          {showAvatar && (
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {message.user.firstName} {message.user.lastName}
              </span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(message.createdAt)}
              </span>
            </div>
          )}

          {/* Message bubble - Clickable for actions */}
          <div className="relative">
            <div 
              onClick={handleMessageClick}
              className={`
                inline-block rounded-2xl px-4 py-3 shadow-sm break-words cursor-pointer
                transition-all duration-200 select-none
                ${isOwnMessage
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md hover:from-blue-600 hover:to-blue-700'
                  : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md hover:border-gray-200 hover:shadow-md'
                }
                ${showActions ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}
              `}
            >
              {/* Reply indicator */}
              {message.replyTo && (
                <div className="text-xs opacity-75 mb-2 italic border-l-2 border-current pl-2">
                  Replying to message...
                </div>
              )}

              {/* Message content */}
              {message.type === 'text' && (
                <p className="text-sm leading-relaxed">{message.content}</p>
              )}
              
              {message.type === 'image' && (
                <img 
                  src={message.content} 
                  alt="Shared image" 
                  className="rounded-lg max-w-full h-auto"
                />
              )}

              {message.type === 'file' && (
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">
                    📄
                  </div>
                  <span className="text-sm">{message.content}</span>
                </div>
              )}
            </div>

            {/* Copy success indicator */}
            {copySuccess && (
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50">
                Copied!
              </div>
            )}
          </div>

          {/* Existing Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-colors"
                >
                  <span>{emoji}</span>
                  <span className="text-gray-600">{userIds.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Actions Menu - Portal positioned to avoid clipping */}
          {showActions && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-[100]"
                onClick={() => {
                  console.log('ChatMessage: Backdrop clicked, closing menu')
                  setShowActions(false)
                }}
              />
              
              {/* Actions Panel - Optimized compact design */}
              <div 
                ref={actionsRef}
                className="fixed z-[101] bg-white rounded-2xl shadow-xl border border-gray-200 p-2"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '220px',
                  maxHeight: '75vh',
                  overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Quick Reactions - More compact */}
                <div className="mb-1.5">
                  <span className="text-xs font-medium text-gray-500 mb-1.5 block px-1">Quick React</span>
                  <div className="flex justify-between px-0.5">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className="text-base hover:scale-110 transition-transform active:scale-95 p-2 rounded-lg hover:bg-gray-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 mb-1.5" />

                {/* Action Buttons - Optimized spacing */}
                <div className="space-y-1">
                  {/* Reply */}
                  <button
                    onClick={handleReply}
                    className="w-full flex items-center px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  >
                    <Reply className="w-4 h-4 mr-2.5 text-gray-500" />
                    Reply
                  </button>

                  {/* Copy */}
                  <button
                    onClick={handleCopyMessage}
                    className="w-full flex items-center px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  >
                    <Copy className="w-4 h-4 mr-2.5 text-gray-500" />
                    Copy
                  </button>

                  {/* Delete or Report */}
                  {isOwnMessage ? (
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center px-2 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4 mr-2.5" />
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={handleReport}
                      className="w-full flex items-center px-2 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px]"
                    >
                      <Flag className="w-4 h-4 mr-2.5" />
                      Report
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage