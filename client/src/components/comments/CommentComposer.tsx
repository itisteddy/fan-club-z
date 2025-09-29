import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useCommentsForPrediction } from '../../store/unifiedCommentStore';
import { useAuthStore } from '../../store/authStore';
import { openAuthGate } from '../../auth/authGateAdapter';
import { showToast } from '../../utils/toasts';
import { qaLog } from '../../utils/devQa';

interface CommentComposerProps {
  predictionId: string;
}

const CommentComposer: React.FC<CommentComposerProps> = ({ predictionId }) => {
  const { user, isAuthenticated } = useAuthStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const {
    draft,
    isPosting,
    addComment,
    setDraft,
    clearDraft,
  } = useCommentsForPrediction(predictionId);

  // Track online status
  useEffect(() => {
    const handleOnlineChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);

    return () => {
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
    };
  }, []);

  // Load draft from session storage on mount
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(`fcz_comment_draft_${predictionId}`);
      if (savedDraft && !draft) {
        setDraft(savedDraft);
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [predictionId, draft, setDraft]);

  // Debounced draft saving
  const saveDraftDebounced = useCallback(
    debounce((text: string) => {
      setDraft(text);
    }, 300),
    [setDraft]
  );

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 120);
    textarea.style.height = newHeight + 'px';

    // Save draft (debounced)
    saveDraftDebounced(value);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but allow Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Clear on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClear();
    }
  };

  // Handle textarea focus for non-authenticated users
  const handleTextareaFocus = async () => {
    if (!isAuthenticated) {
      qaLog('User not authenticated, triggering auth gate on textarea focus');
      try {
        const result = await openAuthGate({ 
          intent: 'comment_prediction', 
          payload: { predictionId } 
        });
        if (result.status === 'success') {
          // User is now authenticated, refocus the textarea
          setTimeout(() => {
            textareaRef.current?.focus();
          }, 100);
        }
      } catch (error) {
        console.error('Auth gate error:', error);
      }
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!isAuthenticated) {
      qaLog('User not authenticated for comment submission, triggering auth gate');
      try {
        const result = await openAuthGate({ 
          intent: 'comment_prediction', 
          payload: { predictionId } 
        });
        if (result.status === 'success') {
          // User is now authenticated, retry the comment submission
          setTimeout(() => handleSubmit(), 100);
        }
      } catch (error) {
        console.error('Auth gate error:', error);
      }
      return;
    }

    const text = draft.trim();
    if (!text) {
      qaLog('Empty comment submission attempted');
      return;
    }

    if (text.length > 280) {
      showToast('Comment is too long (max 280 characters)', 'error', { category: 'validation_error' });
      return;
    }

    if (!isOnline) {
      showToast('You\'re offline. Please try again when connected.', 'error', { category: 'network_error' });
      return;
    }

    setIsSubmitting(true);
    qaLog(`Submitting comment for prediction ${predictionId}:`, text);

    try {
      await addComment(text);
      
      // Clear the textarea
      clearDraft();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = '60px';
      }

      showToast('Comment posted successfully!', 'success', { category: 'user_action' });
      qaLog('Comment submitted successfully');

    } catch (error: any) {
      qaLog('Failed to submit comment:', error);
      
      const errorMessage = error?.message || 'Failed to post comment. Please try again.';
      showToast(errorMessage, 'error', { 
        category: 'user_action',
        throttle: true 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle clear
  const handleClear = () => {
    clearDraft();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '60px';
      textareaRef.current.blur();
    }
  };

  const charCount = draft.length;
  const isOverLimit = charCount > 280;
  const showCounter = charCount > 200;
  const canSubmit = draft.trim().length > 0 && !isOverLimit && !isSubmitting && !isPosting && isOnline && isAuthenticated;

  return (
    <div className="comment-composer">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="comment-composer-offline">
          You're offline. Try again when you're back online.
        </div>
      )}
      
      {/* Main textarea */}
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onFocus={handleTextareaFocus}
        placeholder={!isAuthenticated ? "Sign in to comment" : "Write a comment…"}
        className="comment-textarea"
        disabled={isSubmitting || isPosting || !isOnline}
        maxLength={280}
        style={{ minHeight: '60px', height: '60px', maxHeight: '120px' }}
        aria-label="Write a comment"
        aria-describedby={showCounter ? "comment-counter" : undefined}
      />

      {/* Footer with counter and submit button */}
      <div className="comment-composer-footer">
        <div 
          id="comment-counter"
          className={`comment-counter ${showCounter ? 'visible' : ''} ${
            charCount > 260 ? 'warning' : isOverLimit ? 'error' : ''
          }`}
          aria-live="polite"
        >
          {charCount}/280
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="comment-post-button"
          aria-label="Post comment"
        >
          {isSubmitting || isPosting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send size={16} />
              Post
            </>
          )}
        </button>
      </div>

      {/* Announcement region for screen readers */}
      <div 
        className="sr-only" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {isPosting ? 'Posting comment...' : ''}
      </div>
    </div>
  );
};

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default CommentComposer;