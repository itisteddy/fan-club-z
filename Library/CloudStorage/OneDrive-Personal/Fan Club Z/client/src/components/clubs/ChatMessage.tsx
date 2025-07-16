import React, { useState, useEffect, useRef } from 'react'
import { 
  MoreHorizontal, 
  Reply, 
  Copy, 
  Trash2, 
  Flag,
  Check,
  Heart,
  Smile
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { formatRelativeTime, cn } from '../../lib/utils'
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
  const [isDeleting, setIsDeleting] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [menuPosition, setMenuPosition] = useState<'left' | 'right'>('right')
  const actionsRef = useRef<HTMLDivElement>(null)
  const reactionsRef = useRef<HTMLDivElement>(null)
  const actionButtonRef = useRef<HTMLButtonElement>(null)

  // Common reaction emojis
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡']

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false)
      }
      if (reactionsRef.current && !reactionsRef.current.contains(event.target as Node)) {
        setShowReactions(false)
      }
    }

    if (showActions || showReactions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showActions, showReactions])

  const handleCopyMessage = async () => {
    try {
      console.log('📋 ChatMessage: Copying message:', message.content)
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message.content)
      } else {
        // Fallback for older browsers
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
      
      console.log('✅ ChatMessage: Message copied successfully')
      setCopySuccess(true)
      setShowActions(false)
      
      // Reset copy success indicator after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000)
      
    } catch (error) {
      console.error('❌ ChatMessage: Failed to copy message:', error)
      alert('Failed to copy message. Please try again.')
    }
  }

  const handleReply = () => {
    console.log('💬 ChatMessage: Reply clicked for message:', message.id)
    if (onReply) {
      onReply(message)
      setShowActions(false)
    } else {
      console.log('⚠️ ChatMessage: No onReply handler provided')
    }
  }

  const handleReaction = (emoji: string) => {
    console.log('😀 ChatMessage: Reaction clicked:', emoji, 'for message:', message.id)
    if (onReact) {
      onReact(message.id, emoji)
      setShowReactions(false)
    } else {
      console.log('⚠️ ChatMessage: No onReact handler provided')
    }
  }

  const handleDelete = async () => {
    console.log('🗑️ ChatMessage: Delete clicked for message:', message.id)
    
    if (!isOwnMessage) {
      console.log('❌ ChatMessage: Cannot delete - not own message')
      return
    }

    // Confirm deletion
    const confirmed = window.confirm('Are you sure you want to delete this message?')
    if (!confirmed) {
      console.log('❌ ChatMessage: Delete cancelled by user')
      setShowActions(false)
      return
    }

    try {
      setIsDeleting(true)
      setShowActions(false)
      
      if (onDelete) {
        console.log('🗑️ ChatMessage: Calling onDelete handler')
        onDelete(message.id)
      } else {
        console.log('⚠️ ChatMessage: No onDelete handler provided')
      }
      
    } catch (error) {
      console.error('❌ ChatMessage: Failed to delete message:', error)
      alert('Failed to delete message. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReport = () => {
    console.log('🚩 ChatMessage: Report clicked for message:', message.id)
    
    if (isOwnMessage) {
      console.log('❌ ChatMessage: Cannot report own message')
      return
    }

    // Confirm report
    const confirmed = window.confirm('Are you sure you want to report this message for inappropriate content?')
    if (!confirmed) {
      console.log('❌ ChatMessage: Report cancelled by user')
      setShowActions(false)
      return
    }

    try {
      setShowActions(false)
      
      if (onReport) {
        console.log('🚩 ChatMessage: Calling onReport handler')
        onReport(message.id)
      } else {
        console.log('⚠️ ChatMessage: No onReport handler provided, showing default message')
        alert('Message reported. Thank you for helping keep our community safe.')
      }
      
    } catch (error) {
      console.error('❌ ChatMessage: Failed to report message:', error)
      alert('Failed to report message. Please try again.')
    }
  }

  // Don't render if message is being deleted
  if (isDeleting) {
    return (
      <div className="px-3 py-2 opacity-50">
        <div className="text-sm text-gray-500 italic">Message deleted...</div>
      </div>
    )
  }

  return (
    <div className={cn(
      "group flex items-start space-x-2 hover:bg-gray-50/50 rounded-lg relative transition-colors w-full",
      isConsecutive && "mt-0.5",
      !isConsecutive && "mt-2"
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          <Avatar className="w-7 h-7 border-2 border-white shadow-sm">
            <AvatarImage src={message.user.profileImage || undefined} />
            <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              {message.user.firstName.charAt(0)}{message.user.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7 h-7" /> // Spacer for consecutive messages
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        {/* User name and timestamp */}
        {showAvatar && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold text-gray-900 truncate">
              {message.user.firstName} {message.user.lastName}
            </span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatRelativeTime(message.createdAt)}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className="relative max-w-full">
          <div className={cn(
            "inline-block px-3 py-2 rounded-2xl break-words shadow-sm max-w-full",
            isOwnMessage
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
              : "bg-white border border-gray-100 text-gray-900 rounded-bl-md"
          )}>
            {/* Reply indicator */}
            {message.replyTo && (
              <div className="text-xs opacity-75 mb-1 italic border-l-2 border-current pl-2 mb-2">
                Replying to message...
              </div>
            )}

            {/* Message content */}
            {message.type === 'text' && (
              <p className="text-sm leading-relaxed word-wrap break-words max-w-full overflow-wrap-anywhere">
                {message.content}
              </p>
            )}
            
            {message.type === 'image' && (
              <div className="max-w-full">
                <img 
                  src={message.content} 
                  alt="Shared image" 
                  className="rounded-lg max-w-full h-auto"
                />
              </div>
            )}

            {message.type === 'file' && (
              <div className="flex items-center space-x-2 max-w-full">
                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  📄
                </div>
                <span className="text-sm truncate">{message.content}</span>
              </div>
            )}

            {message.type === 'system' && (
              <p className="text-xs italic opacity-75 break-words max-w-full">{message.content}</p>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 max-w-full">
              {Object.entries(message.reactions).map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-colors flex-shrink-0"
                >
                  <span>{emoji}</span>
                  <span className="text-gray-600">{userIds.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-full shadow-sm p-1">
              {/* Quick Reaction */}
              <div className="relative" ref={reactionsRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowReactions(!showReactions)
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Smile className="w-3.5 h-3.5 text-gray-600" />
                </button>

                {/* Quick Reactions Menu */}
                {showReactions && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50 flex space-x-1">
                    {reactionEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReaction(emoji)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-lg transition-colors active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* More Actions */}
              <div className="relative" ref={actionsRef}>
                <button
                  ref={actionButtonRef}
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('⚙️ ChatMessage: Actions button clicked')
                    
                    // Calculate menu position based on available space
                    if (actionButtonRef.current) {
                      const buttonRect = actionButtonRef.current.getBoundingClientRect()
                      const viewportWidth = window.innerWidth
                      const menuWidth = 140 // min-w-[140px]
                      const spaceOnRight = viewportWidth - buttonRect.right
                      const spaceOnLeft = buttonRect.left
                      
                      // Choose the side with more space, with a preference for right
                      if (spaceOnRight < menuWidth + 8 && spaceOnLeft > menuWidth + 8) {
                        setMenuPosition('left')
                      } else {
                        setMenuPosition('right')
                      }
                    }
                    
                    setShowActions(!showActions)
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-gray-600" />
                </button>

                {/* Actions menu */}
                {showActions && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[140px]">
                    {/* Copy button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyMessage()
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-1 transition-colors"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-500" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </button>

                    {/* Reply button - only for other's messages */}
                    {!isOwnMessage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReply()
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-1 transition-colors"
                      >
                        <Reply className="w-4 h-4 mr-2" />
                        Reply
                      </button>
                    )}

                    {/* Separator */}
                    <div className="border-t border-gray-100 my-1" />

                    {/* Delete button - only for own messages */}
                    {isOwnMessage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete()
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg mx-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    )}

                    {/* Report button - only for other's messages */}
                    {!isOwnMessage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReport()
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg mx-1 transition-colors"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatMessage