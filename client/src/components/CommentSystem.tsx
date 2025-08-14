import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Reply, 
  MoreHorizontal, 
  Edit3, 
  Trash2,
  Flag,
  Send,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSocialStore } from '../store/socialStore';
import { formatTimeAgo } from '../lib/utils';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  prediction_id: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string;
  likes_count: number;
  replies_count: number;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  is_liked?: boolean;
  is_own?: boolean;
  replies?: Comment[];
}

interface CommentSystemProps {
  predictionId: string;
  className?: string;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  predictionId,
  className = ''
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [posting, setPosting] = useState(false);

  const { user, isAuthenticated } = useAuthStore();
  const { 
    getPredictionComments, 
    createComment, 
    updateComment, 
    deleteComment, 
    likeComment 
  } = useSocialStore();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [predictionId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getPredictionComments(predictionId);
      setComments(data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !isAuthenticated || posting) return;

    setPosting(true);
    try {
      const comment = await createComment({
        prediction_id: predictionId,
        content: newComment.trim(),
        parent_comment_id: null
      });

      // Add new comment to the top of the list
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      toast.success('Comment posted!');
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !isAuthenticated || posting) return;

    setPosting(true);
    try {
      const reply = await createComment({
        prediction_id: predictionId,
        content: replyContent.trim(),
        parent_comment_id: parentId
      });

      // Add reply to the parent comment's replies
      setComments(prev => prev.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies_count: comment.replies_count + 1,
            replies: [...(comment.replies || []), reply]
          };
        }
        return comment;
      }));

      setReplyContent('');
      setReplyingTo(null);
      setExpandedReplies(prev => new Set([...prev, parentId]));
      toast.success('Reply posted!');
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setPosting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim() || posting) return;

    setPosting(true);
    try {
      const updatedComment = await updateComment(commentId, editContent.trim());
      
      // Update comment in the list
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, content: editContent.trim(), edited_at: new Date().toISOString() };
        }
        // Update nested replies
        if (comment.replies) {
          comment.replies = comment.replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, content: editContent.trim(), edited_at: new Date().toISOString() }
              : reply
          );
        }
        return comment;
      }));

      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated!');
    } catch (error) {
      console.error('Failed to edit comment:', error);
      toast.error('Failed to edit comment');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      
      // Remove comment from the list
      setComments(prev => prev.filter(comment => {
        if (comment.id === commentId) return false;
        // Also remove from nested replies
        if (comment.replies) {
          comment.replies = comment.replies.filter(reply => reply.id !== commentId);
        }
        return true;
      }));

      toast.success('Comment deleted');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) return;

    try {
      await likeComment(commentId);
      
      // Update like status in the list
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            is_liked: !comment.is_liked,
            likes_count: comment.is_liked 
              ? comment.likes_count - 1 
              : comment.likes_count + 1
          };
        }
        // Update nested replies
        if (comment.replies) {
          comment.replies = comment.replies.map(reply => 
            reply.id === commentId 
              ? {
                  ...reply,
                  is_liked: !reply.is_liked,
                  likes_count: reply.is_liked 
                    ? reply.likes_count - 1 
                    : reply.likes_count + 1
                }
              : reply
          );
        }
        return comment;
      }));
    } catch (error) {
      console.error('Failed to like comment:', error);
      toast.error('Failed to update like');
    }
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: (value: string) => void
  ) => {
    setter(e.target.value);
    autoResizeTextarea(e.target);
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isReply ? 'ml-12 mt-3' : 'mb-6'} relative`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={comment.user.avatar_url || '/default-avatar.png'}
            alt={comment.user.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 text-sm">
              {comment.user.username}
            </span>
            {comment.user.is_verified && (
              <span className="text-blue-500">✓</span>
            )}
            <span className="text-gray-500 text-sm">
              {formatTimeAgo(comment.created_at)}
            </span>
            {comment.edited_at && (
              <span className="text-gray-400 text-xs">(edited)</span>
            )}
          </div>

          {/* Comment Content */}
          {editingComment === comment.id ? (
            <div className="mb-3">
              <textarea
                ref={editInputRef}
                value={editContent}
                onChange={(e) => handleTextareaChange(e, setEditContent)}
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Edit your comment..."
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  disabled={!editContent.trim() || posting}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  className="px-3 py-1 text-gray-600 text-sm rounded-full hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-3">
              <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 text-gray-500">
            {/* Like */}
            <button
              onClick={() => handleLikeComment(comment.id)}
              disabled={!isAuthenticated}
              className={`flex items-center gap-1 text-xs hover:text-red-500 transition-colors ${
                comment.is_liked ? 'text-red-500' : ''
              }`}
            >
              <Heart 
                className={`w-4 h-4 ${comment.is_liked ? 'fill-current' : ''}`} 
              />
              {comment.likes_count > 0 && (
                <span>{comment.likes_count}</span>
              )}
            </button>

            {/* Reply */}
            {!isReply && (
              <button
                onClick={() => {
                  setReplyingTo(comment.id);
                  setTimeout(() => replyInputRef.current?.focus(), 100);
                }}
                disabled={!isAuthenticated}
                className="flex items-center gap-1 text-xs hover:text-blue-500 transition-colors"
              >
                <Reply className="w-4 h-4" />
                Reply
              </button>
            )}

            {/* More options */}
            {(comment.is_own || user?.id === comment.user_id) && (
              <div className="relative">
                <button
                  onClick={() => {
                    // Simple menu for now
                    if (comment.is_own || user?.id === comment.user_id) {
                      const action = window.confirm('Edit comment?');
                      if (action) {
                        setEditingComment(comment.id);
                        setEditContent(comment.content);
                        setTimeout(() => editInputRef.current?.focus(), 100);
                      } else {
                        handleDeleteComment(comment.id);
                      }
                    }
                  }}
                  className="flex items-center gap-1 text-xs hover:text-gray-700 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3"
            >
              <div className="flex gap-3">
                <img
                  src={user?.avatar_url || '/default-avatar.png'}
                  alt="Your avatar"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <textarea
                    ref={replyInputRef}
                    value={replyContent}
                    onChange={(e) => handleTextareaChange(e, setReplyContent)}
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={`Reply to @${comment.user.username}...`}
                    rows={2}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyContent.trim() || posting}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      className="px-3 py-1 text-gray-600 text-sm rounded-full hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Replies */}
          {comment.replies_count > 0 && (
            <div className="mt-3">
              {!expandedReplies.has(comment.id) ? (
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="text-blue-500 text-sm hover:underline"
                >
                  Show {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="text-gray-500 text-sm hover:underline mb-2"
                  >
                    Hide replies
                  </button>
                  <div className="space-y-3">
                    {comment.replies?.map(reply => renderComment(reply, true))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`${className}`}>
      {/* New Comment Input */}
      {isAuthenticated && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex gap-3">
            <img
              src={user?.avatar_url || '/default-avatar.png'}
              alt="Your avatar"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) => handleTextareaChange(e, setNewComment)}
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What do you think about this prediction?"
                rows={3}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="text-sm text-gray-500">
                  {newComment.length}/280
                </div>
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || posting || newComment.length > 280}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                >
                  {posting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Comment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-16 bg-gray-200 rounded mb-2"></div>
                    <div className="flex gap-4">
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No comments yet
            </h3>
            <p className="text-gray-600">
              Be the first to share your thoughts on this prediction!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map(comment => renderComment(comment))}
          </AnimatePresence>
        )}
      </div>

      {/* Load More (for pagination) */}
      {comments.length > 0 && comments.length % 10 === 0 && (
        <div className="text-center mt-6">
          <button
            onClick={loadComments}
            className="px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Load more comments
          </button>
        </div>
      )}
    </div>
  );
};