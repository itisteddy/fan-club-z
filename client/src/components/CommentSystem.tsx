import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { MessageCircle, Heart, Reply, MoreHorizontal, Flag, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  is_verified: boolean;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  is_edited?: boolean;
  likes_count: number;
  replies_count: number;
  depth: number;
  thread_id?: string;
  is_liked: boolean;
  is_own: boolean;
  replies?: Comment[];
}

interface CommentSystemProps {
  predictionId: string;
  initialComments?: Comment[];
}

// Completely isolated textarea component that manages its own state internally
const IsolatedTextarea: React.FC<{
  initialValue?: string;
  onValueChange?: (value: string) => void;
  placeholder: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
}> = ({ 
  initialValue = '', 
  onValueChange, 
  placeholder, 
  rows = 3, 
  maxLength = 500, 
  autoFocus = false, 
  className = '',
  disabled = false 
}) => {
  // Internal state - completely isolated from parent
  const [internalValue, setInternalValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastValueRef = useRef(initialValue);

  // Only update internal state if initialValue changes from outside
  useEffect(() => {
    if (initialValue !== lastValueRef.current) {
      setInternalValue(initialValue);
      lastValueRef.current = initialValue;
    }
  }, [initialValue]);

  // Handle changes internally first, then notify parent
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Update internal state immediately
    setInternalValue(newValue);
    lastValueRef.current = newValue;
    
    // Notify parent of change
    if (onValueChange) {
      onValueChange(newValue);
    }
  }, [onValueChange]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent event bubbling that might interfere with other textareas
    e.stopPropagation();
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      // Could trigger submit here if needed
    }
  }, []);

  // Auto-focus effect
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const textarea = textareaRef.current;
      // Small delay to ensure proper focus
      setTimeout(() => {
        textarea.focus();
        // Put cursor at end
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }, 100);
    }
  }, [autoFocus]);

  return (
    <div className="isolated-textarea-wrapper">
      <textarea
        ref={textareaRef}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${className}`}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{ 
          minHeight: `${rows * 1.5}rem`,
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
};

const CommentSystem: React.FC<CommentSystemProps> = ({ predictionId, initialComments = [] }) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Separate state for each text input - completely isolated
  const [mainCommentText, setMainCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Mock data with unique keys
  const mockComments = useMemo(() => [
    {
      id: `mock-comment-1-${predictionId}`,
      content: 'This is a great prediction! I think it will definitely happen.',
      user_id: 'user1',
      prediction_id: predictionId,
      username: 'CryptoFan',
      avatar_url: null,
      is_verified: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      is_liked: false,
      is_own: false,
      likes_count: 5,
      replies_count: 1,
      depth: 0,
      replies: [
        {
          id: `mock-reply-1-1-${predictionId}`,
          content: 'I completely agree with this analysis.',
          user_id: 'user2',
          prediction_id: predictionId,
          username: 'MarketAnalyst',
          avatar_url: null,
          is_verified: true,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          updated_at: new Date(Date.now() - 1800000).toISOString(),
          is_liked: true,
          is_own: false,
          likes_count: 3,
          replies_count: 0,
          depth: 1,
          replies: []
        }
      ]
    }
  ], [predictionId]);

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try to fetch from API first
        const response = await fetch(`/api/v2/predictions/${predictionId}/comments`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Comments loaded from API:', data);
          setComments(data.comments || []);
        } else {
          throw new Error(`API responded with ${response.status}`);
        }
      } catch (error) {
        console.log('📝 API not available, using mock comments:', error);
        setComments(mockComments);
        setError('Demo mode - Using local comments. API will be available in production.');
      } finally {
        setLoading(false);
      }
    };

    if (predictionId) {
      loadComments();
    }
  }, [predictionId, mockComments]);

  // Text management helpers with proper isolation
  const updateReplyText = useCallback((commentId: string, text: string) => {
    setReplyTexts(prev => ({
      ...prev,
      [commentId]: text
    }));
  }, []);

  const updateEditText = useCallback((commentId: string, text: string) => {
    setEditTexts(prev => ({
      ...prev,
      [commentId]: text
    }));
  }, []);

  const clearReplyText = useCallback((commentId: string) => {
    setReplyTexts(prev => {
      const updated = { ...prev };
      delete updated[commentId];
      return updated;
    });
  }, []);

  const clearEditText = useCallback((commentId: string) => {
    setEditTexts(prev => {
      const updated = { ...prev };
      delete updated[commentId];
      return updated;
    });
  }, []);

  // Submit comment function
  const submitComment = useCallback(async (parentId?: string) => {
    const content = parentId ? (replyTexts[parentId] || '') : mainCommentText;
    
    if (!content.trim()) {
      console.log('❌ Cannot submit empty comment');
      return;
    }

    if (!user) {
      setError('Please log in to comment');
      return;
    }

    console.log('💬 Submitting comment:', { content, parentId });

    try {
      if (parentId) {
        setReplyLoading(prev => ({ ...prev, [parentId]: true }));
      } else {
        setSubmitLoading(true);
      }
      setError(null);
      
      // API call
      const response = await fetch(`/api/v2/predictions/${predictionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          parent_comment_id: parentId || null,
        }),
      });

      if (response.ok) {
        const newCommentObj = await response.json();
        console.log('✅ Comment created via API:', newCommentObj);
        
        if (parentId) {
          setComments(prev =>
            prev.map(c => 
              c.id === parentId
                ? { 
                    ...c, 
                    replies: [...(c.replies || []), newCommentObj],
                    replies_count: c.replies_count + 1 
                  }
                : c
            )
          );
          clearReplyText(parentId);
          setReplyTo(null);
        } else {
          setComments(prev => [newCommentObj, ...prev]);
          setMainCommentText(''); // Clear main comment
        }
      } else {
        throw new Error(`API responded with ${response.status}`);
      }
      
    } catch (error) {
      console.log('📝 API not available, creating local comment:', error);
      
      // Fallback to local creation
      const newCommentObj = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: content.trim(),
        user_id: user.id,
        prediction_id: predictionId,
        username: user.username || 'You',
        avatar_url: user.avatar_url || null,
        is_verified: user.is_verified || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_liked: false,
        is_own: true,
        likes_count: 0,
        replies_count: 0,
        depth: parentId ? 1 : 0,
        replies: []
      };
      
      if (parentId) {
        setComments(prev =>
          prev.map(c => 
            c.id === parentId
              ? { 
                  ...c, 
                  replies: [...(c.replies || []), newCommentObj],
                  replies_count: c.replies_count + 1 
                }
              : c
          )
        );
        clearReplyText(parentId);
        setReplyTo(null);
      } else {
        setComments(prev => [newCommentObj, ...prev]);
        setMainCommentText(''); // Clear main comment
      }
      
      console.log('✅ Local comment added successfully');
    } finally {
      if (parentId) {
        setReplyLoading(prev => ({ ...prev, [parentId]: false }));
      } else {
        setSubmitLoading(false);
      }
    }
  }, [user, predictionId, mainCommentText, replyTexts, clearReplyText]);

  // Toggle like
  const toggleLike = useCallback(async (commentId: string) => {
    if (!user) return;

    // Optimistically update the UI
    setComments(prev =>
      prev.map(comment => {
        if (comment.id === commentId) {
          return { 
            ...comment, 
            is_liked: !comment.is_liked, 
            likes_count: comment.is_liked ? comment.likes_count - 1 : comment.likes_count + 1 
          };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply.id === commentId
                ? { 
                    ...reply, 
                    is_liked: !reply.is_liked, 
                    likes_count: reply.is_liked ? reply.likes_count - 1 : reply.likes_count + 1 
                  }
                : reply
            ),
          };
        }
        return comment;
      })
    );

    try {
      await fetch(`/api/v2/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.log('❤️ Like API not available, using optimistic update');
    }
  }, [user]);

  // Edit and reply management
  const startEdit = useCallback((commentId: string, currentContent: string) => {
    setEditingComment(commentId);
    setEditTexts(prev => ({ ...prev, [commentId]: currentContent }));
  }, []);

  const cancelEdit = useCallback((commentId: string) => {
    setEditingComment(null);
    clearEditText(commentId);
  }, [clearEditText]);

  const startReply = useCallback((commentId: string) => {
    setReplyTo(commentId);
    setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
  }, []);

  const cancelReply = useCallback((commentId: string) => {
    setReplyTo(null);
    clearReplyText(commentId);
  }, [clearReplyText]);

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = React.memo(({ comment, isReply = false }) => {
    const [showOptions, setShowOptions] = useState(false);
    const isCurrentlyEditing = editingComment === comment.id;
    const isCurrentlyReplying = replyTo === comment.id;

    return (
      <div className={`comment-item ${isReply ? 'ml-8 pl-4 border-l-2 border-gray-100' : ''} py-4`}>
        <div className="flex space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              {comment.avatar_url ? (
                <img
                  src={comment.avatar_url}
                  alt={comment.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-green-600 font-semibold text-sm">
                  {comment.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-sm text-gray-900">
                {comment.username || 'Anonymous'}
              </span>
              {comment.is_verified && (
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
                    initialValue={editTexts[comment.id] || comment.content}
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
                          setEditingComment(null);
                          clearEditText(comment.id);
                        }}
                        disabled={!(editTexts[comment.id] || '').trim()}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                onClick={() => toggleLike(comment.id)}
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
                  initialValue={replyTexts[comment.id] || ''}
                  onValueChange={(value) => updateReplyText(comment.id, value)}
                  placeholder={`Reply to ${comment.username}...`}
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
                      onClick={() => submitComment(comment.id)}
                      disabled={!(replyTexts[comment.id] || '').trim() || replyLoading[comment.id]}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {replyLoading[comment.id] ? 'Replying...' : 'Reply'}
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
                {comment.replies.map((reply) => (
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
          Comments ({comments.length})
        </h3>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center">
            <div className="text-blue-800 text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* New comment input */}
      {user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-green-600 font-semibold text-sm">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <IsolatedTextarea
                initialValue={mainCommentText}
                onValueChange={setMainCommentText}
                placeholder="Share your thoughts..."
                rows={3}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {mainCommentText.length}/500
                </span>
                <button
                  onClick={() => submitComment()}
                  disabled={!mainCommentText.trim() || submitLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {submitLoading ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comments...</p>
        </div>
      )}

      {/* Comments list */}
      {!loading && (
        <div className="divide-y divide-gray-100">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && comments.length === 0 && (
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