import React, { useState, useEffect, useRef } from 'react'
import { 
  Send, 
  Smile,
  X,
  Heart,
  Reply,
  Copy,
  Flag,
  Trash2,
  Check,
  MessageCircle
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { formatRelativeTime } from '../../lib/utils'

interface Comment {
  id: string
  user: {
    name: string
    avatar?: string | null
    id?: string
  }
  text: string
  time: string
  likes?: number
  isLiked?: boolean
  replyTo?: string
}

interface BetCommentsProps {
  comments: Comment[]
  onAddComment: (text: string) => void
  currentUser?: {
    id: string
    name: string
    avatar?: string | null
  } | null
  loading?: boolean
  error?: string | null
  maxHeight?: string
}

const BetComments: React.FC<BetCommentsProps> = ({
  comments,
  onAddComment,
  currentUser,
  loading = false,
  error = null,
  maxHeight = "calc(100vh - 180px)" // Much taller default
}) => {
  const [commentText, setCommentText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: { count: number, isLiked: boolean } }>({})
  const [showActions, setShowActions] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const commentsContainerRef = useRef<HTMLDivElement>(null)

  // Common emojis for quick access
  const commonEmojis = [
    '😀', '😂', '🤔', '👍', '👎', '❤️', 
    '🔥', '💯', '🎉', '👏', '🚀', '⚽'
  ]

  // Quick reaction emojis
  const quickEmojis = ['❤️', '👍', '😂', '😮']

  // Auto-scroll to bottom when new comments are added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // Initialize comment likes from props
  useEffect(() => {
    const initialLikes: { [key: string]: { count: number, isLiked: boolean } } = {}
    comments.forEach(comment => {
      initialLikes[comment.id] = {
        count: comment.likes || 0,
        isLiked: comment.isLiked || false
      }
    })
    setCommentLikes(initialLikes)
  }, [comments])

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(null)
      }
    }

    if (showEmojiPicker || showActions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker, showActions])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (commentText.trim()) {
      const finalText = replyingTo 
        ? `@${replyingTo.user.name}: ${commentText.trim()}`
        : commentText.trim()
      
      onAddComment(finalText)
      setCommentText('')
      setReplyingTo(null)
      setShowEmojiPicker(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setReplyingTo(null)
      setCommentText('')
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    console.log('BetComments: Emoji selected:', emoji)
    const newValue = commentText + emoji
    setCommentText(newValue)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const handleLikeComment = (commentId: string) => {
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: {
        count: prev[commentId]?.isLiked 
          ? (prev[commentId]?.count || 0) - 1
          : (prev[commentId]?.count || 0) + 1,
        isLiked: !prev[commentId]?.isLiked
      }
    }))
  }

  const handleCopyComment = async (text: string, commentId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      setCopySuccess(commentId)
      setShowActions(null)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (error) {
      console.error('Failed to copy comment:', error)
    }
  }

  const handleReplyToComment = (comment: Comment) => {
    setReplyingTo(comment)
    setShowActions(null)
    inputRef.current?.focus()
  }

  const handleReportComment = (commentId: string) => {
    const confirmed = window.confirm('Are you sure you want to report this comment?')
    if (confirmed) {
      setShowActions(null)
      alert('Comment reported. Thank you for helping keep our community safe.')
    }
  }

  const isOwnComment = (comment: Comment) => {
    return currentUser && comment.user.id === currentUser.id
  }

  const canSend = commentText.trim().length > 0

  // Handle comment tap/click with smart menu positioning
  const handleCommentClick = (e: React.MouseEvent, comment: Comment) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Don't interfere with text selection
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      return
    }

    setShowActions(showActions === comment.id ? null : comment.id)
  }

  // Calculate smart menu position to avoid cutoff
  const getMenuPosition = (commentId: string) => {
    if (!commentsContainerRef.current) return { bottom: 'auto', top: 'auto' }
    
    const containerRect = commentsContainerRef.current.getBoundingClientRect()
    const containerBottom = containerRect.bottom
    const menuHeight = 320 // Estimated menu height
    const spaceBelow = window.innerHeight - containerBottom
    
    // If not enough space below, show menu above
    return spaceBelow < menuHeight ? { bottom: '100%', top: 'auto', marginBottom: '8px' } : { top: '100%', bottom: 'auto', marginTop: '8px' }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Compact Header */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>
      </div>

      {/* Comments List - Takes up most of the space */}
      <div 
        ref={commentsContainerRef}
        className="flex-1 overflow-y-auto bg-white min-h-0"
        style={{ 
          maxHeight: maxHeight,
          minHeight: 'calc(100vh - 350px)' // Ensure minimum height
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading comments...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-blue-500" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Start the conversation</h4>
            <p className="text-gray-500 text-sm">Be the first to share your thoughts on this bet!</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-8">
              {comments.map((comment, index) => {
                const likeData = commentLikes[comment.id] || { count: 0, isLiked: false }
                const showAvatar = index === 0 || comments[index - 1].user.id !== comment.user.id
                const menuPosition = getMenuPosition(comment.id)
                
                return (
                  <div key={comment.id} className="group">
                    <div className="flex items-start space-x-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                            <AvatarImage src={comment.user.avatar || undefined} />
                            <AvatarFallback className="text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                              {comment.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 h-10" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0 relative">
                        {/* Header */}
                        {showAvatar && (
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-sm font-semibold text-gray-900">
                              {comment.user.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {comment.time}
                            </span>
                          </div>
                        )}

                        {/* Message Bubble - More spacious */}
                        <div className="relative">
                          <div 
                            onClick={(e) => handleCommentClick(e, comment)}
                            className={`
                              inline-block rounded-2xl px-4 py-3 shadow-sm break-words cursor-pointer
                              transition-all duration-200 select-none max-w-2xl
                              ${isOwnComment(comment)
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md hover:from-blue-600 hover:to-blue-700'
                                : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-md hover:border-gray-300 hover:shadow-md'
                              }
                              ${showActions === comment.id ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}
                            `}
                          >
                            <p className="text-sm leading-relaxed">{comment.text}</p>

                            {/* Copy success indicator */}
                            {copySuccess === comment.id && (
                              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50">
                                Copied!
                              </div>
                            )}
                          </div>

                          {/* Like count display (only if likes exist) */}
                          {likeData.count > 0 && (
                            <div className="flex items-center mt-3">
                              <button
                                onClick={() => handleLikeComment(comment.id)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium transition-colors hover:bg-red-100"
                              >
                                <Heart className="w-3 h-3 fill-current" />
                                <span>{likeData.count}</span>
                              </button>
                            </div>
                          )}

                          {/* Actions Menu - Centered positioning to avoid cutoff */}
                          {showActions === comment.id && (
                            <>
                              {/* Backdrop */}
                              <div 
                                className="fixed inset-0 z-[100]"
                                onClick={() => setShowActions(null)}
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
                                        onClick={() => {
                                          if (emoji === '❤️') {
                                            handleLikeComment(comment.id)
                                          }
                                          setShowActions(null)
                                        }}
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
                                  {/* Like */}
                                  <button
                                    onClick={() => {
                                      handleLikeComment(comment.id)
                                      setShowActions(null)
                                    }}
                                    className={`w-full flex items-center px-2 py-2.5 text-sm rounded-lg transition-colors min-h-[44px] ${
                                      likeData.isLiked 
                                        ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <Heart className={`w-4 h-4 mr-2.5 ${likeData.isLiked ? 'fill-current' : ''}`} />
                                    {likeData.isLiked ? 'Unlike' : 'Like'}
                                  </button>

                                  {/* Reply */}
                                  {!isOwnComment(comment) && (
                                    <button
                                      onClick={() => handleReplyToComment(comment)}
                                      className="w-full flex items-center px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                                    >
                                      <Reply className="w-4 h-4 mr-2.5 text-gray-500" />
                                      Reply
                                    </button>
                                  )}

                                  {/* Copy */}
                                  <button
                                    onClick={() => handleCopyComment(comment.text, comment.id)}
                                    className="w-full flex items-center px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                                  >
                                    <Copy className="w-4 h-4 mr-2.5 text-gray-500" />
                                    Copy
                                  </button>

                                  {/* Delete or Report */}
                                  {isOwnComment(comment) ? (
                                    <button
                                      onClick={() => {
                                        const confirmed = window.confirm('Are you sure you want to delete this comment?')
                                        if (confirmed) {
                                          setShowActions(null)
                                          alert('Delete functionality not implemented yet')
                                        }
                                      }}
                                      className="w-full flex items-center px-2 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px]"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2.5" />
                                      Delete
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleReportComment(comment.id)}
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
                  </div>
                )
              })}
              <div ref={commentsEndRef} />
              
              {/* Extra space at bottom to ensure menu visibility */}
              <div className="h-96" />
            </div>
          </div>
        )}
      </div>

      {/* Comment Input - Fixed at bottom */}
      {currentUser ? (
        <div className="border-t border-gray-100 p-6 bg-white relative flex-shrink-0">
          {/* Reply Preview */}
          {replyingTo && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  Replying to {replyingTo.user.name}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-blue-600" />
                </button>
              </div>
              <p className="text-sm text-blue-600 line-clamp-2">
                {replyingTo.text}
              </p>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute bottom-full left-6 right-6 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-[60]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Add an emoji</span>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {commonEmojis.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('BetComments: Emoji button clicked:', emoji)
                      handleEmojiSelect(emoji)
                    }}
                    className="p-3 rounded-xl hover:bg-gray-100 text-xl transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex items-end space-x-4">
            {/* User Avatar */}
            <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-white shadow-sm">
              <AvatarImage src={currentUser.avatar || undefined} />
              <AvatarFallback className="text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                {currentUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Input Container */}
            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 px-5 py-4 flex items-center space-x-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={replyingTo ? `Replying to ${replyingTo.user.name}...` : "Add a comment..."}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm"
                autoComplete="off"
              />
              
              {/* Emoji Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('BetComments: Emoji picker button clicked, current state:', showEmojiPicker)
                  setShowEmojiPicker(!showEmojiPicker)
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
              >
                <Smile className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!canSend}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0 shadow-sm
                ${canSend
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      ) : (
        <div className="border-t border-gray-100 p-6 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="text-center">
            <p className="text-sm text-blue-700 mb-4 font-medium">
              Join the conversation and share your insights!
            </p>
            <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm">
              Sign In to Comment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BetComments