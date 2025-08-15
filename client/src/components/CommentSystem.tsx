import React, { useState, useEffect } from 'react';
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
  is_edited: boolean;
  likes_count: number;
  replies_count: number;
  depth: number;
  thread_id: string;
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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch comments
  const fetchComments = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/predictions/${predictionId}/comments?page=${pageNum}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (pageNum === 1) {
          setComments(data.comments);
        } else {
          setComments(prev => [...prev, ...data.comments]);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch replies for a comment
  const fetchReplies = async (threadId: string) => {
    try {
      const response = await fetch(`/api/comments/${threadId}/replies`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      
      if (response.ok) {
        const replies = await response.json();
        setComments(prev => 
          prev.map(comment => 
            comment.thread_id === threadId 
              ? { ...comment, replies }
              : comment
          )
        );
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  // Submit new comment
  const submitComment = async (parentId?: string) => {
    if (!newComment.trim() || !user) return;

    try {
      const response = await fetch(`/api/predictions/${predictionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          content: newComment.trim(),
          parent_comment_id: parentId,
        }),
      });

      if (response.ok) {
        const comment = await response.json();
        
        if (parentId) {
          // Add to replies
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
        } else {
          // Add as top-level comment
          setComments(prev => [comment, ...prev]);
        }
        
        setNewComment('');
        setReplyTo(null);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  // Edit comment
  const editComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        setComments(prev =>
          prev.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, ...updatedComment };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(reply =>
                  reply.id === commentId ? { ...reply, ...updatedComment } : reply
                ),
              };
            }
            return comment;
          })
        );
        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  // Toggle like
  const toggleLike = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
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
      const response = await fetch(`/api/comments/${commentId}`, {
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
    }
  };

  // Load initial comments
  useEffect(() => {
    if (!initialComments.length) {
      fetchComments();
    }
  }, [predictionId]);

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({ comment, isReply = false }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    return (
      <div className={`comment-item ${isReply ? 'ml-8 pl-4 border-l-2 border-gray-100' : ''}`}>
        <div className="flex space-x-3 p-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <img
              src={comment.avatar_url || '/api/placeholder/32/32'}
              alt={comment.username}
              className="w-8 h-8 rounded-full bg-gray-200"
            />
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-sm text-gray-900">
                {comment.username}
              </span>
              {comment.is_verified && (
                <span className="text-blue-500">✓</span>
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
              {editingComment === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none"
                    rows={2}
                    placeholder="Edit your comment..."
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editComment(comment.id)}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditContent('');
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
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
                <span>{comment.likes_count}</span>
              </button>

              {!isReply && comment.depth < 3 && (
                <button
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <Reply size={14} />
                  <span>Reply</span>
                </button>
              )}

              {comment.replies_count > 0 && !isReply && (
                <button
                  onClick={() => {
                    setShowReplies(!showReplies);
                    if (!showReplies && !comment.replies) {
                      fetchReplies(comment.thread_id);
                    }
                  }}
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                >
                  {showReplies ? 'Hide' : 'Show'} {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
                </button>
              )}

              {/* Options menu */}
              <div className="relative">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MoreHorizontal size={14} />
                </button>
                
                {showOptions && (
                  <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                    {comment.is_own ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditContent(comment.content);
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
                          // Report functionality
                          setShowOptions(false);
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Flag size={14} className="mr-2" />
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Reply input */}
            {replyTo === comment.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder={`Reply to ${comment.username}...`}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => submitComment(comment.id)}
                    disabled={!newComment.trim()}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyTo(null);
                      setNewComment('');
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Replies */}
            {showReplies && comment.replies && comment.replies.length > 0 && (
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
    <div className="comment-system bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold flex items-center">
          <MessageCircle size={20} className="mr-2" />
          Comments ({comments.length})
        </h3>
      </div>

      {/* New comment input */}
      {user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-3">
            <img
              src={user.avatar_url || '/api/placeholder/32/32'}
              alt={user.username}
              className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Share your thoughts..."
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length}/500
                </span>
                <button
                  onClick={() => submitComment()}
                  disabled={!newComment.trim() || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Comment
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
      {hasMore && (
        <div className="p-4 text-center">
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchComments(nextPage);
            }}
            disabled={loading}
            className="px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Load More Comments'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {comments.length === 0 && !loading && (
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
