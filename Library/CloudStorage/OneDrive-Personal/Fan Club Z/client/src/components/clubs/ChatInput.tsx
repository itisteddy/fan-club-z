import React, { useState, useEffect, useRef } from 'react'
import { 
  Send, 
  Smile,
  X,
  Paperclip,
  Image,
  FileText
} from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string, type?: 'text' | 'image' | 'file') => void
  onTyping?: () => void
  onStopTyping?: () => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  showAttachments?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onTyping,
  onStopTyping,
  placeholder = "Type a message...",
  disabled = false,
  maxLength = 1000,
  showAttachments = true
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)

  // Common emojis for quick access
  const commonEmojis = [
    '😀', '😂', '🥰', '😎', '🤔', '👍', '👎', '❤️', 
    '🔥', '💯', '🎉', '👏', '🚀', '⚽', '🏆', '💰'
  ]

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false)
      }
    }

    if (showEmojiPicker || showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showEmojiPicker, showAttachmentMenu])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    console.log('ChatInput: handleSubmit called with value:', value, 'disabled:', disabled)
    
    if (value.trim()) {
      console.log('ChatInput: Sending message:', value.trim())
      onSend(value.trim())
      onChange('') // Clear the input
      setShowEmojiPicker(false)
      setShowAttachmentMenu(false)
    } else {
      console.log('ChatInput: Cannot send - empty message')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log('ChatInput: Input changing to:', newValue)
    
    if (newValue.length <= maxLength) {
      onChange(newValue)
      
      // Trigger typing indicator
      if (newValue.trim() && onTyping) {
        onTyping()
      } else if (!newValue.trim() && onStopTyping) {
        onStopTyping()
      }
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    console.log('ChatInput: Emoji selected:', emoji)
    const newValue = value + emoji
    onChange(newValue)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const handleAttachmentSelect = (type: 'image' | 'file') => {
    console.log('ChatInput: Attachment type selected:', type)
    setShowAttachmentMenu(false)
    
    // Create file input for selection
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = type === 'image' ? 'image/*' : '*/*'
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        // For demo purposes, just show filename
        onSend(`[${type.toUpperCase()}] ${file.name}`, type)
      }
    }
    
    input.click()
  }

  const canSend = value.trim().length > 0

  console.log('ChatInput: Rendering with value:', value, 'disabled:', disabled, 'canSend:', canSend)

  return (
    <div className="bg-white border-t border-gray-100 p-2 relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50"
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
          <div className="grid grid-cols-8 gap-2">
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                className="p-3 rounded-xl hover:bg-gray-100 text-xl transition-all duration-200 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Menu */}
      {showAttachmentMenu && showAttachments && (
        <div 
          ref={attachmentMenuRef}
          className="absolute bottom-full left-4 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 min-w-[180px]"
        >
          <button
            onClick={() => handleAttachmentSelect('image')}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Image className="w-4 h-4 mr-3 text-blue-500" />
            Upload Image
          </button>
          <button
            onClick={() => handleAttachmentSelect('file')}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4 mr-3 text-green-500" />
            Upload File
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2 w-full">
        {/* Attachment Button */}
        {showAttachments && (
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            disabled={disabled}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <Paperclip className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Main Input Container */}
        <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-2 flex items-center space-x-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all min-w-0">
          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base min-w-0"
            autoComplete="off"
            style={{ fontSize: '16px' }} // Prevent zoom on iOS
          />
          
          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
          >
            <Smile className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!canSend || disabled}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0 shadow-sm
            ${canSend && !disabled
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      
      {/* Character count */}
      {value.length > maxLength * 0.8 && (
        <div className={`
          text-xs mt-2 text-right
          ${value.length >= maxLength ? "text-red-500" : "text-gray-400"}
        `}>
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  )
}

export default ChatInput