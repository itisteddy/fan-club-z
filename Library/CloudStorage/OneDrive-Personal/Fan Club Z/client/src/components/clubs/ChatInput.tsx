import React, { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Smile, 
  Paperclip, 
  Image as ImageIcon,
  Plus,
  X
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { cn } from '../../lib/utils'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string, type?: 'text' | 'image' | 'file') => void
  onTyping?: () => void
  onStopTyping?: () => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onTyping,
  onStopTyping,
  placeholder = "Type a message...",
  disabled = false,
  maxLength = 1000
}) => {
  const [isMultiline, setIsMultiline] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)

  // Common emojis for quick access
  const commonEmojis = [
    '😀', '😂', '🥰', '😎', '🤔', '👍', '👎', '❤️', 
    '🔥', '💯', '🎉', '👏', '🚀', '⚽', '🏆', '💰',
    '🎯', '📈', '📉', '⭐', '✨', '🌟', '💡', '🎮'
  ]

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setIsMultiline(false)
      setShowEmojiPicker(false)
      setShowAttachmentMenu(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter for new line
        if (!isMultiline) {
          setIsMultiline(true)
          setTimeout(() => {
            textareaRef.current?.focus()
          }, 0)
        }
      } else {
        // Enter to send
        e.preventDefault()
        handleSubmit(e)
      }
    } else if (e.key === 'Escape') {
      if (isMultiline) {
        setIsMultiline(false)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 0)
      }
      setShowEmojiPicker(false)
      setShowAttachmentMenu(false)
    }
  }

  const handleInputChange = (newValue: string) => {
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
    const newValue = value + emoji
    handleInputChange(newValue)
    setShowEmojiPicker(false)
    
    // Focus back to input
    if (isMultiline) {
      textareaRef.current?.focus()
    } else {
      inputRef.current?.focus()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real app, you'd upload the file and get a URL
      onSend(`📎 ${file.name}`, 'file')
      e.target.value = '' // Reset input
      setShowAttachmentMenu(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real app, you'd upload the image and get a URL
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        onSend(`🖼️ Image: ${file.name}`, 'image')
      }
      reader.readAsDataURL(file)
      e.target.value = '' // Reset input
      setShowAttachmentMenu(false)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (isMultiline && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [value, isMultiline])

  return (
    <div className="border-t border-gray-200 bg-white p-3 relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Pick an emoji</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                className="p-2 rounded hover:bg-gray-100 text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Menu */}
      {showAttachmentMenu && (
        <div 
          ref={attachmentMenuRef}
          className="absolute bottom-full left-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 w-48"
        >
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              <Paperclip className="w-4 h-4 mr-2" />
              File
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-shrink-0 p-2 h-9 w-9"
          disabled={disabled}
          onClick={() => {
            setShowAttachmentMenu(!showAttachmentMenu)
            setShowEmojiPicker(false)
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          {isMultiline ? (
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="min-h-[40px] max-h-[120px] resize-none pr-8"
                rows={1}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsMultiline(false)}
                className="absolute top-1 right-1 p-1 h-6 w-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="pr-8"
            />
          )}
          
          {/* Character count */}
          {value.length > maxLength * 0.8 && (
            <div className={cn(
              "absolute -top-6 right-0 text-xs",
              value.length >= maxLength ? "text-red-500" : "text-gray-400"
            )}>
              {value.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Emoji button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-shrink-0 p-2 h-9 w-9"
          disabled={disabled}
          onClick={() => {
            setShowEmojiPicker(!showEmojiPicker)
            setShowAttachmentMenu(false)
          }}
        >
          <Smile className="w-4 h-4" />
        </Button>

        {/* Send button */}
        <Button
          type="submit"
          size="sm"
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 p-2 h-9 w-9"
        >
          <Send className="w-4 h-4" />
        </Button>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </form>
    </div>
  )
}

export default ChatInput