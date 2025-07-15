import React, { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Smile, 
  Paperclip, 
  Image as ImageIcon,
  Mic,
  Plus,
  X
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Common emojis for quick access
  const commonEmojis = [
    '😀', '😂', '🥰', '😎', '🤔', '👍', '👎', '❤️', 
    '🔥', '💯', '🎉', '👏', '🚀', '⚽', '🏆', '💰',
    '🎯', '📈', '📉', '⭐', '✨', '🌟', '💡', '🎮'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setIsMultiline(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter for new line
        if (!isMultiline) {
          setIsMultiline(true)
          // Transfer value to textarea
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
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real app, you'd upload the image and get a URL
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        onSend(imageUrl, 'image')
      }
      reader.readAsDataURL(file)
      e.target.value = '' // Reset input
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
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        {/* Attachment button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-shrink-0 p-2"
              disabled={disabled}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-48 p-2">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Photo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                File
              </Button>
            </div>
          </PopoverContent>
        </Popover>

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

        {/* Emoji picker */}
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-shrink-0 p-2"
              disabled={disabled}
            >
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-64 p-3">
            <div className="grid grid-cols-8 gap-1">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="p-1 rounded hover:bg-gray-100 text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Send button */}
        <Button
          type="submit"
          size="sm"
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 p-2"
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