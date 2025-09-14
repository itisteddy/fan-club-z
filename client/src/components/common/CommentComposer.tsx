import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentComposerProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  replyTo?: string;
  initialValue?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
  className?: string;
  showCancelButton?: boolean;
  submitButtonText?: string;
  isSubmitting?: boolean;
}

/**
 * Unified Comment Composer Component
 * 
 * Provides consistent comment and reply input across the app with:
 * - Unified styling for new comments and replies
 * - Character counter (0/500 format)
 * - Consistent button styling (primary filled for submit, subtle for cancel)
 * - Inline error handling with friendly messages
 * - Content and user validation before network calls
 * - No avatar bubble beside textbox
 * - Standard cursor appearance (caret only)
 * - Proper accessibility support
 */
export const CommentComposer: React.FC<CommentComposerProps> = ({
  onSubmit,
  placeholder = 'Share your thoughts…',
  replyTo,
  initialValue = '',
  maxLength = 500,
  disabled = false,
  autoFocus = false,
  onCancel,
  className = '',
  showCancelButton = false,
  submitButtonText,
  isSubmitting = false
}) => {
  const [content, setContent] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update content when initialValue changes
  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Generate placeholder text
  const getPlaceholder = () => {
    if (replyTo) {
      return `Reply to @${replyTo}…`;
    }
    return placeholder;
  };

  // Generate submit button text
  const getSubmitButtonText = () => {
    if (submitButtonText) return submitButtonText;
    return replyTo ? 'Reply' : 'Post';
  };

  // Validate content before submission
  const validateContent = useCallback((text: string) => {
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      return 'Please enter some content before posting';
    }
    
    if (trimmedText.length < 3) {
      return 'Comment must be at least 3 characters long';
    }
    
    if (trimmedText.length > maxLength) {
      return `Comment must be ${maxLength} characters or less`;
    }
    
    return null;
  }, [maxLength]);

  // Handle content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    
    // Limit content to maxLength
    if (newContent.length <= maxLength) {
      setContent(newContent);
    }
  }, [error, maxLength]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validationError = validateContent(content);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsInternalSubmitting(true);
    setError(null);

    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (error: any) {
      // Show friendly error message
      const errorMessage = error?.message || 'Failed to post comment. Please try again.';
      setError(errorMessage);
    } finally {
      setIsInternalSubmitting(false);
    }
  }, [content, onSubmit, validateContent]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setContent('');
    setError(null);
    onCancel?.();
  }, [onCancel]);

  const isSubmitDisabled = !content.trim() || isSubmitting || isInternalSubmitting || disabled;
  const characterCount = content.length;

  return (
    <div className={`comment-composer ${className}`}>
      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={disabled || isSubmitting || isInternalSubmitting}
          autoFocus={autoFocus}
          className={`
            w-full p-3 pr-12 border border-gray-200 rounded-lg resize-none
            focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
            transition-all duration-200 min-h-[44px] max-h-[120px]
            placeholder:text-gray-500 text-sm leading-relaxed
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
          `}
          style={{
            fontFamily: 'inherit',
            cursor: 'text' // Ensure standard caret cursor
          }}
          maxLength={maxLength}
        />
        
        {/* Character counter */}
        <div className="absolute bottom-2 left-3 text-xs text-gray-400 pointer-events-none">
          {characterCount}/{maxLength}
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-3">
        {/* Cancel button */}
        {showCancelButton && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCancel}
            disabled={disabled || isSubmitting || isInternalSubmitting}
            className={`
              flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
              transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300
              ${disabled || isSubmitting || isInternalSubmitting
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }
            `}
            type="button"
          >
            <X size={16} />
            Cancel
          </motion.button>
        )}

        {/* Submit button */}
        <motion.button
          whileHover={{ scale: isSubmitDisabled ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitDisabled ? 1 : 0.98 }}
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`
            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
            transition-all duration-200 focus:outline-none focus:ring-2
            ${isSubmitDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500/20 shadow-sm'
            }
          `}
          type="button"
        >
          {(isSubmitting || isInternalSubmitting) ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Posting...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>{getSubmitButtonText()}</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="mt-2 text-xs text-gray-400 text-center">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘ + Enter</kbd> to post
      </div>
    </div>
  );
};

export default CommentComposer;
