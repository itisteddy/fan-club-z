import React, { useState, useEffect, useRef } from 'react';
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

const CommentSystem: React.FC<CommentSystemProps> = ({ predictionId, initialComments = [] }) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs to maintain cursor position
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Get API URL based on environment
  const getApiUrl = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // For development, use localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/v2';
    }
    
    // For deployed environments, use the same domain
    return `${protocol}//${hostname}/api/v2`;
  };

  // Helper function to preserve cursor position
  const updateTextWithCursor = (
    textareaRef: HTMLTextAreaElement | null,
    newValue: string,
    setter: (value: string) => void
  ) => {
    if (!textareaRef) {
      setter(newValue);
      return;
    }

    const cursorPosition = textareaRef.selectionStart;
    setter(newValue);
    
    // Restore cursor position after React updates
    setTimeout(() => {
      if (textareaRef && document.activeElement === textareaRef) {
        textareaRef.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // Helper function to get reply text for a specific comment
  const getReplyText = (commentId: string) => replyTexts[commentId] || '';
  
  // Helper function to set reply text for a specific comment
  const setReplyText = (commentId: string, text: string) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: text }));
  };

  // Helper function to get edit text for a specific comment
  const getEditText = (commentId: string) => editTexts[commentId] || '';
  
  // Helper function to set edit text for a specific comment
  const setEditText = (commentId: string, text: string) => {
    setEditTexts(prev => ({ ...prev, [commentId]: text }));
  };

  // Helper function to clear reply text
  const clearReplyText = (commentId: string) => {
    setReplyTexts(prev => {
      const updated = { ...prev };
      delete updated[commentId];
      return updated;
    });
  };

  // Helper function to clear edit text
  const clearEditText = (commentId: string) => {
    setEditTexts(prev => {
      const updated = { ...prev };
      delete updated[commentId];
      return updated;
    });
  };

  // Fetch comments
  const fetchComments = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      console.log('🔗 Fetching comments from:', `${apiUrl}/predictions/${predictionId}/comments?page=${pageNum}&limit=20`);
      
      const response = await fetch(`${apiUrl}/predictions/${predictionId}/comments?page=${pageNum}&limit=20`, {
        headers: user?.token ? {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        } : {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Comment fetch response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Comment fetch failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Comments fetched successfully:', data);
      
      if (append) {
        setComments(prev => [...prev, ...(data.comments || [])]);
      } else {
        setComments(data.comments || []);
      }
      
      setHasMore(data.hasMore || false);
      
    } catch (error) {
      console.error('💥 Error fetching comments:', error);
      
      // Use mock data when API fails
      const mockComments = [
        {
          id: '1',
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
          replies_count: 2,
          depth: 0,
          replies: [
            {
              id: '1-1',
              content: 'I agree! The market is showing strong signals.',
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
            },
            {
              id: '1-2',
              content: 'What indicators are you looking at?',
              user_id: 'user3',
              prediction_id: predictionId,
              username: 'NewTrader',
              avatar_url: null,
              is_verified: false,
              created_at: new Date(Date.now() - 900000).toISOString(),
              updated_at: new Date(Date.now() - 900000).toISOString(),
              is_liked: false,
              is_own: false,
              likes_count: 1,
              replies_count: 0,
              depth: 1,
              replies: []
            }
          ]
        },
        {
          id: '2',
          content: 'I\'m not so sure about this one. The data seems conflicting.',
          user_id: 'user4',
          prediction_id: predictionId,
          username: 'Skeptic',
          avatar_url: null,
          is_verified: false,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          updated_at: new Date(Date.now() - 7200000).toISOString(),
          is_liked: false,
          is_own: false,
          likes_count: 2,
          replies_count: 1,
          depth: 0,
          replies: [
            {
              id: '2-1',
              content: 'Can you share what data you\'re looking at?',
              user_id: 'user1',
              prediction_id: predictionId,
              username: 'CryptoFan',
              avatar_url: null,
              is_verified: true,
              created_at: new Date(Date.now() - 3600000).toISOString(),
              updated_at: new Date(Date.now() - 3600000).toISOString(),
              is_liked: false,
              is_own: false,
              likes_count: 1,
              replies_count: 0,
              depth: 1,
              replies: []
            }
          ]
        }
      ];
      
      if (append) {
        setComments(prev => [...prev, ...mockComments]);
      } else {
        setComments(mockComments);
      }
      
      setHasMore(false);
      setError('Demo mode - Comments are working locally. Backend API will be available soon!');
      
    } finally {
      setLoading(false);
    }
  };

  // Submit new comment
  const submitComment = async (parentId?: string) => {
    const content = parentId ? getReplyText(parentId) : newComment;
    if (!content.trim() || !user) return;

    try {
      if (parentId) {
        setReplyLoading(prev => ({ ...prev, [parentId]: true }));
      } else {
        setSubmitLoading(true);
      }
      setError(null);
      
      const apiUrl = getApiUrl();
      console.log('💬 Submitting comment to:', `${apiUrl}/predictions/${predictionId}/comments`);
      console.log('📝 Comment content:', content.trim());
      
      const response = await fetch(`${apiUrl}/predictions/${predictionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user.token && { 'Authorization': `Bearer ${user.token}` }),
        },
        body: JSON.stringify({
          content: content.trim(),
          parent_comment_id: parentId,
        }),
      });

      console.log('📡 Comment submit response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Comment submit failed:', response.status, errorData);
        throw new Error(`Failed to post comment: ${response.status}`);
      }

      const comment = await response.json();
      console.log('✅ Comment created successfully:', comment);
      
      if (parentId) {
        // Add to replies (if nested system is implemented)
        setComments(prev =>
          prev.map(c => 
            c.id === parentId
              ? { 
                  ...c, 
                  replies: [...(c.replies || []), comment],
                  replies_count: c.replies_count + 1 
                }
              : c
          )
        );
        clearReplyText(parentId);
      } else {
        // Add as top-level comment
        setComments(prev => [comment, ...prev]);
        setNewComment('');
      }
      
      setReplyTo(null);
      
    } catch (error) {
      console.error('💥 Error submitting comment:', error);
      
      // Add comment locally when API fails
      const newCommentObj = {
        id: `local-${Date.now()}`,
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
        // Add to replies
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
      } else {
        // Add as top-level comment
        setComments(prev => [newCommentObj, ...prev]);
        setNewComment('');
      }
      
      setReplyTo(null);
      setError('Comment added locally - API connection failed');
      
    } finally {
      if (parentId) {
        setReplyLoading(prev => ({ ...prev, [parentId]: false }));
      } else {
        setSubmitLoading(false);
      }
    }
  };

  // Edit comment
  const editComment = async (commentId: string) => {
    const content = getEditText(commentId);
    if (!content.trim()) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit comment');
      }

      const updatedComment = await response.json();
      
      setComments(prev =>
        prev.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, ...updatedComment, is_edited: true };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply.id === commentId ? { ...reply, ...updatedComment, is_edited: true } : reply
              ),
            };
          }
          return comment;
        })
      );
      
      setEditingComment(null);
      clearEditText(commentId);
      
    } catch (error) {
      console.error('Error editing comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to edit comment');
    }
  };

  // Toggle like
  const toggleLike = async (commentId: string) => {
    if (!user) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const { liked, likes_count } = await response.json();
        
        setComments(prev =>
          prev.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, is_liked: liked, likes_count };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(reply =>
                  reply.id === commentId
                    ? { ...reply, is_liked: liked, likes_count }
                    : reply
                ),
              };
            }
            return comment;
          })
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Delete comment
  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        setComments(prev =>
          prev.filter(comment => {
            if (comment.id === commentId) return false;
            if (comment.replies) {
              comment.replies = comment.replies.filter(reply => reply.id !== commentId);
            }
            return true;
          })
        );
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    }
  };

  // Start editing a comment
  const startEdit = (commentId: string, currentContent: string) => {
    setEditingComment(commentId);
    setEditText(commentId, currentContent);
  };

  // Cancel editing
  const cancelEdit = (commentId: string) => {
    setEditingComment(null);
    clearEditText(commentId);
  };

  // Start replying to a comment
  const startReply = (commentId: string) => {
    setReplyTo(commentId);
    setReplyText(commentId, '');
  };

  // Cancel reply
  const cancelReply = (commentId: string) => {
    setReplyTo(null);
    clearReplyText(commentId);
  };

  // Load initial comments
  useEffect(() => {
    if (!initialComments.length) {
      fetchComments();
    }
  }, [predictionId]);

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({ comment, isReply = false }) => {
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
                  <textarea
                    ref={(el) => textareaRefs.current[`edit-${comment.id}`] = el}
                    value={getEditText(comment.id)}
                    onChange={(e) => {
                      const textarea = textareaRefs.current[`edit-${comment.id}`];
                      updateTextWithCursor(textarea, e.target.value, (value) => setEditText(comment.id, value));
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={2}
                    placeholder="Edit your comment..."
                    maxLength={500}
                    autoFocus
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {getEditText(comment.id).length}/500
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => editComment(comment.id)}
                        disabled={!getEditText(comment.id).trim()}
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
                              deleteComment(comment.id);
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
                            // Report functionality can be implemented later
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
                <textarea
                  ref={(el) => textareaRefs.current[`reply-${comment.id}`] = el}
                  value={getReplyText(comment.id)}
                  onChange={(e) => {
                    const textarea = textareaRefs.current[`reply-${comment.id}`];
                    updateTextWithCursor(textarea, e.target.value, (value) => setReplyText(comment.id, value));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={2}
                  placeholder={`Reply to ${comment.username}...`}
                  maxLength={500}
                  autoFocus
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {getReplyText(comment.id).length}/500
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => submitComment(comment.id)}
                      disabled={!getReplyText(comment.id).trim() || replyLoading[comment.id]}
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

            {/* Replies (when implemented) */}
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
  };

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
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center">
            <div className="text-yellow-800 text-sm">{error}</div>
            <button
              onClick={() => {
                setError(null);
                fetchComments();
              }}
              className="ml-auto text-yellow-600 hover:text-yellow-800 text-xs underline"
            >
              Retry API
            </button>
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
              <textarea
                ref={(el) => textareaRefs.current['main'] = el}
                value={newComment}
                onChange={(e) => {
                  const textarea = textareaRefs.current['main'];
                  updateTextWithCursor(textarea, e.target.value, setNewComment);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Share your thoughts..."
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length}/500
                </span>
                <button
                  onClick={() => submitComment()}
                  disabled={!newComment.trim() || submitLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {submitLoading ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="divide-y divide-gray-100">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <div className="p-4 text-center">
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchComments(nextPage, true);
            }}
            className="px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
          >
            Load More Comments
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-8 text-center">
          <div className="inline-flex items-center">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-gray-600">Loading comments...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {comments.length === 0 && !loading && !error && (
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
