import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCommentsForPrediction } from '../store/unifiedCommentStore';
import { MessageCircle, Heart, Reply, MoreHorizontal, Flag, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import TappableUsername from './TappableUsername';

interface CommentSystemProps {
  predictionId: string;
}

// Completely isolated textarea component that manages its own state internally
const IsolatedTextarea: React.FC<{
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
}> = ({ 
  id,
  value,
  onValueChange,
  placeholder, 
  rows = 3, 
  maxLength = 500, 
  autoFocus = false, 
  className = '',
  disabled = false 
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(e.target.value);
  }, [onValueChange]);

  return (
    <textarea
      id={id}
      value={value}
      onChange={handleChange}
      className={`w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${className}`}
      rows={rows}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      autoFocus={autoFocus}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      style={{ 
        minHeight: `${rows * 1.5}rem`,
        fontFamily: 'inherit'
      }}
    />
  );
};

const CommentSystem: React.FC<CommentSystemProps> = ({ predictionId }) => {
  const { user } = useAuthStore();
  const {
    comments,
    commentCount,
    isLoading,
    error,
    isSubmitting,
    fetchComments,
    addComment,
    toggleCommentLike,
    clearError
  } = useCommentsForPrediction(predictionId);

  // Local state for text inputs
  const [mainCommentText, setMainCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);

  // Track which predictions have been fetched to prevent repeated fetches
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  
  // Stable reference to prediction ID to prevent effect re-runs
  const stablePredictionId = useRef(predictionId);
  
  // Update stable ref only when prediction ID actually changes
  useEffect(() => {
    if (stablePredictionId.current !== predictionId) {
      stablePredictionId.current = predictionId;
      setHasAttemptedFetch(false); // Reset fetch attempt for new prediction
    }
  }, [predictionId]);

  // Load comments on mount - FIXED: Prevent infinite loop
  useEffect(() => {
    // Only fetch if:
    // 1. We have a valid prediction ID
    // 2. We haven't already attempted to fetch for this prediction
    // 3. We're not currently loading
    if (predictionId && 
        predictionId.trim() &&
        !hasAttemptedFetch && 
        !isLoading) {
      
      console.log(`🔄 Fetching comments for prediction ${predictionId}`);
      
      // Mark as attempted immediately to prevent race conditions
      setHasAttemptedFetch(true);
      
      // Fetch comments with error handling
      fetchComments().catch(error => {
        console.error('❌ Failed to fetch comments:', error);
        // Allow retry on next component mount or prop change
        setHasAttemptedFetch(false);
      });
    }
  }, [predictionId, hasAttemptedFetch, isLoading]);

  // Handle adding a comment
  const handleAddComment = useCallback(async (parentId?: string) => {
    const content = parentId ? (replyTexts[parentId] || '') : mainCommentText;
    
    if (!content.trim()) {
      return;
    }

    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Pass user data to the comment creation
      await addComment(content.trim(), parentId, {
        id: user.id,
        username: user.firstName || user.email?.split('@')[0] || 'Anonymous',
        full_name: `${user.firstName} ${user.lastName}`.trim() || user.email?.split('@')[0] || 'Anonymous User',
        avatar_url: user.avatar,
        is_verified: false
      });
      
      // Clear the text input
      if (parentId) {
        setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
        setReplyTo(null);
      } else {
        setMainCommentText('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }, [user, mainCommentText, replyTexts, addComment]);

  // Handle toggling like
  const handleToggleLike = useCallback(async (commentId: string) => {
    if (!user) {
      return;
    }
    
    try {
      await toggleCommentLike(commentId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }, [user, toggleCommentLike]);

  // Text management helpers
  const updateReplyText = useCallback((commentId: string, text: string) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: text }));
  }, []);

  const updateEditText = useCallback((commentId: string, text: string) => {
    setEditTexts(prev => ({ ...prev, [commentId]: text }));
  }, []);

  // Edit and reply management
  const startEdit = useCallback((commentId: string, currentContent: string) => {
    setEditingComment(commentId);
    setEditTexts(prev => ({ ...prev, [commentId]: currentContent }));
  }, []);

  const cancelEdit = useCallback((commentId: string) => {
    setEditingComment(null);
    setEditTexts(prev => {
      const updated = { ...prev };
      delete updated[commentId];
      return updated;
    });
  }, []);

  const startReply = useCallback((commentId: string) => {
    setReplyTo(commentId);
    setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
  }, []);

  const cancelReply = useCallback((commentId: string) => {
    setReplyTo(null);
    setReplyTexts(prev => {
      const updated = { ...prev };
      delete updated[commentId];
      return updated;
    });
  }, []);

  const CommentItem = React.memo(function CommentItem({ comment, isReply = false }: { comment: any; isReply?: boolean }) {
    const [showOptions, setShowOptions] = useState(false);
    const isCurrentlyEditing = editingComment === comment.id;
    const isCurrentlyReplying = replyTo === comment.id;

    return (
      <div className={`comment-item ${isReply ? 'ml-8 pl-4 border-l-2 border-gray-100' : ''} p-4 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
        <div className="flex space-x-3">
          {/* Only show avatar if user has an actual avatar URL */}
          {comment.user?.avatar_url && (
            <div className="flex-shrink-0">
              <img
                src={comment.user.avatar_url}
                alt={comment.user.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
          )}

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-2">
              <TappableUsername 
                username={comment.user?.username || comment.username || 'Anonymous'}
                userId={comment.user?.id}
                className="font-semibold text-sm text-gray-900 hover:text-teal-600 transition-colors"
              />
              {(comment.user?.is_verified || comment.is_verified) && (
                <span className="text-blue-500 text-xs">✓</span>
              )}
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>

            {/* Content */}
            <div className="mb-2">
              {isCurrentlyEditing ? (
                <div className="space-y-2">
                  <IsolatedTextarea
                    id={`edit-textarea-${comment.id}`}
                    value={editTexts[comment.id] || comment.content}
                    onValueChange={(value) => updateEditText(comment.id, value)}
                    placeholder="Edit your comment..."
                    rows={2}
                    maxLength={500}
                    autoFocus
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {(editTexts[comment.id] || '').length}/500
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // TODO: Implement edit functionality
                          setEditingComment(null);
                        }}
                        disabled={!(editTexts[comment.id] || '').trim()}
                        className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => cancelEdit(comment.id)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4 text-xs">
              <button
                onClick={() => handleToggleLike(comment.id)}
                className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
                  comment.is_liked ? 'text-red-500' : 'text-gray-500'
                }`}
              >
                <Heart size={14} className={comment.is_liked ? 'fill-current' : ''} />
                <span>{comment.likes_count || 0}</span>
              </button>

              {!isReply && (
                <button
                  onClick={() => isCurrentlyReplying ? cancelReply(comment.id) : startReply(comment.id)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <Reply size={14} />
                  <span>{isCurrentlyReplying ? 'Cancel' : 'Reply'}</span>
                </button>
              )}

              {/* Options menu */}
              <div className="relative">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <MoreHorizontal size={14} />
                </button>
                
                {showOptions && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowOptions(false)}
                    />
                    <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                      {comment.is_own ? (
                        <>
                          <button
                            onClick={() => {
                              startEdit(comment.id, comment.content);
                              setShowOptions(false);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit size={14} className="mr-2" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setShowOptions(false);
                              // TODO: Implement delete functionality
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setShowOptions(false);
                            // TODO: Implement report functionality
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Flag size={14} className="mr-2" />
                          Report
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Reply input */}
            {isCurrentlyReplying && (
              <div className="mt-3 space-y-2">
                <IsolatedTextarea
                  id={`reply-textarea-${comment.id}`}
                  value={replyTexts[comment.id] || ''}
                  onValueChange={(value) => updateReplyText(comment.id, value)}
                  placeholder={`Reply to ${comment.user?.username || comment.username}...`}
                  rows={2}
                  maxLength={500}
                  autoFocus
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {(replyTexts[comment.id] || '').length}/500
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAddComment(comment.id)}
                      disabled={!(replyTexts[comment.id] || '').trim() || isSubmitting}
                                              className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Replying...' : 'Reply'}
                    </button>
                    <button
                      onClick={() => cancelReply(comment.id)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map((reply: any) => (
                  <CommentItem key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="comment-system bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold flex items-center">
          <MessageCircle size={20} className="mr-2" />
          Comments ({commentCount})
        </h3>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <div className="text-red-800 text-sm">{error}</div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* New comment input */}
      {user && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="w-full">
            <IsolatedTextarea
              id="main-textarea"
              value={mainCommentText}
              onValueChange={setMainCommentText}
              placeholder="Share your thoughts..."
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-500">
                {mainCommentText.length}/500
              </span>
              <button
                onClick={() => handleAddComment()}
                disabled={!mainCommentText.trim() || isSubmitting}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSubmitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login prompt for non-authenticated users */}
      {!user && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-gray-600 text-center">
            Please <span className="text-teal-600 font-medium">sign in</span> to join the conversation
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comments...</p>
        </div>
      )}

      {/* Comments list */}
      {!isLoading && (
        <div className="divide-y divide-gray-100">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && comments.length === 0 && !error && (
        <div className="p-8 text-center text-gray-500">
          <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium mb-2">No comments yet</h4>
          <p>Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
};

export default CommentSystem;