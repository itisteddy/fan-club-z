import React, { useState } from 'react'
import { 
  MoreVertical, 
  Reply, 
  Copy, 
  Trash2, 
  Flag,
  Heart,
  ThumbsUp,
  Laugh,
  Angry
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'
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
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  showAvatar,
  isConsecutive,
  isOwnMessage,
  onReply,
  onReact,
  onDelete
}) => {
  const [showReactions, setShowReactions] = useState(false)

  const reactions = [
    { emoji: '❤️', key: 'heart' },
    { emoji: '👍', key: 'thumbs_up' },
    { emoji: '😂', key: 'laugh' },
    { emoji: '😮', key: 'wow' },
    { emoji: '😢', key: 'sad' },
    { emoji: '😡', key: 'angry' }
  ]

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleReaction = (emoji: string) => {
    onReact?.(message.id, emoji)
    setShowReactions(false)
  }

  const getReactionCount = (reactionKey: string) => {
    return message.reactions?.[reactionKey]?.length || 0
  }

  const hasUserReacted = (reactionKey: string, userId?: string) => {
    if (!userId || !message.reactions?.[reactionKey]) return false
    return message.reactions[reactionKey].includes(userId)
  }

  return (
    <div className={cn(
      "group flex items-start space-x-3",
      isConsecutive && "mt-1",
      !isConsecutive && "mt-4"
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          <Avatar className="w-8 h-8">
            <AvatarImage src={message.user.profileImage || undefined} />
            <AvatarFallback>
              {message.user.firstName.charAt(0)}{message.user.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 h-8" /> // Spacer for consecutive messages
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* User name and timestamp */}
        {showAvatar && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {message.user.firstName} {message.user.lastName}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(message.createdAt)}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className="relative group/message">
          <div className={cn(
            "inline-block px-3 py-2 rounded-lg max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg break-words",
            isOwnMessage
              ? "bg-blue-500 text-white ml-auto"
              : "bg-gray-100 text-gray-900"
          )}>
            {/* Reply indicator */}
            {message.replyTo && (
              <div className="text-xs opacity-75 mb-1 italic">
                Replying to message...
              </div>
            )}

            {/* Message content */}
            {message.type === 'text' && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            
            {message.type === 'image' && (
              <div>
                <img 
                  src={message.content} 
                  alt="Shared image" 
                  className="rounded max-w-full h-auto"
                />
              </div>
            )}

            {message.type === 'file' && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                  📄
                </div>
                <span className="text-sm">{message.content}</span>
              </div>
            )}

            {message.type === 'system' && (
              <p className="text-xs italic opacity-75">{message.content}</p>
            )}
          </div>

          {/* Message actions (visible on hover) */}
          <div className="absolute top-0 right-0 opacity-0 group-hover/message:opacity-100 transition-opacity">
            <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
              {/* Quick reactions */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100"
                onClick={() => handleReaction('heart')}
              >
                ❤️
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100"
                onClick={() => handleReaction('thumbs_up')}
              >
                👍
              </Button>

              {/* More actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onReply?.(message)}>
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyMessage}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isOwnMessage && (
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(message.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                  {!isOwnMessage && (
                    <DropdownMenuItem className="text-red-600">
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(message.reactions).map(([reactionKey, userIds]) => {
              if (userIds.length === 0) return null
              
              const reaction = reactions.find(r => r.key === reactionKey)
              if (!reaction) return null

              return (
                <button
                  key={reactionKey}
                  onClick={() => handleReaction(reactionKey)}
                  className={cn(
                    "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors",
                    hasUserReacted(reactionKey, 'current-user-id') // TODO: Pass actual user ID
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span>{userIds.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage