import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  X,
  Smile,
  ThumbsUp,
  Laugh,
  Angry,
  Frown,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSocialStore } from '../store/socialStore';
import { formatTimeAgo } from '../lib/utils';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
}

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
  is_edited?: boolean;
  is_flagged?: boolean;
  user: User;
  is_liked?: boolean;
  is_liked_by_user?: boolean;
  is_own?: boolean;
  is_owned_by_user?: boolean;
  replies?: Comment[];
}

interface CommentSystemProps {
  predictionId: string;
  className?: string;
  onCommentCountChange?: (newCount: number) => void;
  enableRealTime?: boolean;
  enableModeration?: boolean;
}

// Emoji reactions for comments
const EMOJI_REACTIONS = [
  { type: 'like', emoji: '👍', icon: ThumbsUp, label: 'Like' },
  { type: 'love', emoji: '❤️', icon: Heart, label: 'Love' },
  { type: 'laugh', emoji: '😂', icon: Laugh, label: 'Laugh' },
  { type: 'angry', emoji: '😠', icon: Angry, label: 'Angry' },
  { type: 'sad', emoji: '😢', icon: Frown, label: 'Sad' },
];

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
];

export const CommentSystem: React.FC<CommentSystemProps> = ({
  predictionId,
  className = '',
  onCommentCountChange,
  enableRealTime = true,
  enableModeration = true,
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
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

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
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!enableRealTime || !predictionId) return;

    // TODO: Implement WebSocket connection for real-time comment updates
    // const ws = new WebSocket(`ws://localhost:5000/comments/${predictionId}`);
    // ws.onmessage = (event) => {
    //   const update = JSON.parse(event.data);
    //   handleRealTimeUpdate(update);
    // };
    // return () => ws.close();
  }, [predictionId, enableRealTime]);

  // Helper function to update comment count
  const updateCommentCount = useCallback(() => {
    const topLevelComments = comments.filter(comment => !comment.parent_comment_id);
    const newCount = topLevelComments.length;
    if (onCommentCountChange) {
      onCommentCountChange(newCount);
    }
  }, [comments, onCommentCountChange]);

  // Update count whenever comments change
  useEffect(() => {
    updateCommentCount();
  }, [updateCommentCount]);

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [predictionId]);

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadComments = async () => {
    try {
      setLoading(true);
      console.log('Loading comments for prediction:', predictionId);
      const data = await getPredictionComments(predictionId);
      console.log('Loaded comments:', data?.length || 0);
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
      console.log('Creating comment:', { predictionId, content: newComment.trim() });
      const comment = await createComment({
        prediction_id: predictionId,
        content: newComment.trim(),
        parent_comment_id: null
      });

      console.log('Comment created successfully:', comment);

      // Add new comment to the top of the list
      setComments(prev => {
        const newComments = [comment, ...prev];
        console.log('Updated comments count:', newComments.length);
        return newComments;
      });
      
      setNewComment('');
      toast.success('Comment posted!');

      // Trigger confetti animation for first comment
      if (comments.length === 0) {
        // TODO: Add confetti animation
      }

      // Manually trigger count update
      setTimeout(() => {
        const topLevelComments = [comment, ...comments.filter(c => !c.parent_comment_id)];
        if (onCommentCountChange) {
          onCommentCountChange(topLevelComments.length);
        }
      }, 100);

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
          return { ...comment, content: editContent.trim(), is_edited: true, edited_at: new Date().toISOString() };
        }
        // Update nested replies
        if (comment.replies) {
          comment.replies = comment.replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, content: editContent.trim(), is_edited: true, edited_at: new Date().toISOString() }
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
      
      // Find if this is a top-level comment to update count properly
      const deletedComment = comments.find(c => c.id === commentId);
      const isTopLevel = deletedComment && !deletedComment.parent_comment_id;
      
      // Remove comment from the list
      setComments(prev => {
        const newComments = prev.filter(comment => {
          if (comment.id === commentId) return false;
          // Also remove from nested replies
          if (comment.replies) {
            comment.replies = comment.replies.filter(reply => reply.id !== commentId);
          }
          return true;
        });

        // Update count if top-level comment was deleted
        if (isTopLevel && onCommentCountChange) {
          const topLevelCount = newComments.filter(c => !c.parent_comment_id).length;
          onCommentCountChange(topLevelCount);
        }

        return newComments;
      });

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
            is_liked_by_user: !comment.is_liked_by_user,
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
                  is_liked_by_user: !reply.is_liked_by_user,
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

  const handleEmojiReaction = async (commentId: string, reactionType: string) => {
    if (!isAuthenticated) return;

    try {
      // For now, treat all emoji reactions as likes
      await handleLikeComment(commentId);
      setShowReactionPicker(null);
      
      // Add visual feedback
      const emoji = EMOJI_REACTIONS.find(r => r.type === reactionType)?.emoji;
      if (emoji) {
        toast.success(`Reacted with ${emoji}`, { duration: 1000 });
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleReportComment = async (commentId: string) => {
    if (!reportReason || submittingReport) return;

    setSubmittingReport(true);
    try {
      // TODO: Implement report API call
      // await reportComment(commentId, reportReason, reportDescription);
      
      console.log('Reporting comment:', { commentId, reportReason, reportDescription });
      
      setShowReportModal(null);
      setReportReason('');
      setReportDescription('');
      toast.success('Comment reported. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Failed to report comment:', error);
      toast.error('Failed to report comment');
    } finally {
      setSubmittingReport(false);
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

  const renderReactionPicker = (commentId: string) => (
    <motion.div
      ref={reactionPickerRef}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex gap-1 z-20"
    >
      {EMOJI_REACTIONS.map(({ type, emoji, label }) => (
        <button
          key={type}
          onClick={() => handleEmojiReaction(commentId, type)}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-lg transition-colors"
          title={label}
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );

  const renderReportModal = () => (
    <AnimatePresence>
      {showReportModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReportModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <Flag className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Report Comment</h3>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a reason</option>
                {REPORT_REASONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide any additional context..."
                rows={3}
                maxLength={500}
              />
              <div className="text-sm text-gray-500 mt-1">
                {reportDescription.length}/500
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(null)}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReportComment(showReportModal)}
                disabled={!reportReason || submittingReport}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submittingReport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Reporting...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    Report
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

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
            {comment.is_edited && (
              <span className="text-gray-400 text-xs">(edited)</span>
            )}
            {comment.is_flagged && enableModeration && (
              <div className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
                <Shield className="w-3 h-3" />
                Flagged
              </div>
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
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {editContent.length}/500
              </div>
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
          <div className="flex items-center gap-4 text-gray-500 relative">
            {/* Like with emoji picker */}
            <div className="relative">
              <button
                onClick={() => {
                  if (showReactionPicker === comment.id) {
                    setShowReactionPicker(null);
                  } else {
                    handleLikeComment(comment.id);
                  }
                }}
                onMouseEnter={() => setShowReactionPicker(comment.id)}
                onMouseLeave={() => setTimeout(() => setShowReactionPicker(null), 1000)}
                disabled={!isAuthenticated}
                className={`flex items-center gap-1 text-xs hover:text-red-500 transition-colors ${
                  comment.is_liked || comment.is_liked_by_user ? 'text-red-500' : ''
                }`}
              >
                <Heart 
                  className={`w-4 h-4 ${(comment.is_liked || comment.is_liked_by_user) ? 'fill-current' : ''}`} 
                />
                {comment.likes_count > 0 && (
                  <span>{comment.likes_count}</span>
                )}
              </button>
              
              {/* Reaction Picker */}
              <AnimatePresence>
                {showReactionPicker === comment.id && (
                  renderReactionPicker(comment.id)
                )}
              </AnimatePresence>
            </div>

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
            <div className="relative">
              <button
                onClick={() => {
                  const isOwner = comment.is_own || comment.is_owned_by_user || user?.id === comment.user_id;
                  
                  if (isOwner) {
                    // Owner options
                    const action = window.confirm('Edit comment? (Cancel to delete)');
                    if (action) {
                      setEditingComment(comment.id);
                      setEditContent(comment.content);
                      setTimeout(() => editInputRef.current?.focus(), 100);
                    } else {
                      handleDeleteComment(comment.id);
                    }
                  } else if (enableModeration) {
                    // Report option for non-owners
                    setShowReportModal(comment.id);
                  }
                }}
                className="flex items-center gap-1 text-xs hover:text-gray-700 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Report button (visible alternative) */}
            {enableModeration && !(comment.is_own || comment.is_owned_by_user || user?.id === comment.user_id) && (
              <button
                onClick={() => setShowReportModal(comment.id)}
                className="flex items-center gap-1 text-xs hover:text-red-500 transition-colors"
                title="Report comment"
              >
                <Flag className="w-4 h-4" />
              </button>
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
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {replyContent.length}/500
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyContent.trim() || posting}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      {posting ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
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
                  className="text-blue-500 text-sm hover:underline flex items-center gap-1"
                >
                  <Reply className="w-3 h-3" />
                  Show {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="text-gray-500 text-sm hover:underline mb-2 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
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
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {newComment.length}/500
                  </div>
                  <button
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    title="Add emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || posting || newComment.length > 500}
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

      {!isAuthenticated && (
        <div className="mb-6 bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-gray-600 mb-2">Join the conversation!</p>
          <p className="text-sm text-gray-500">Sign in to comment on this prediction</p>
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

      {/* Report Modal */}
      {renderReportModal()}
    </div>
  );
};