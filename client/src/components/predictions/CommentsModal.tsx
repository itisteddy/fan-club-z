import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import UserAvatar from '../common/UserAvatar';
import { useUnifiedCommentStore, useCommentsForPrediction } from '../../store/unifiedCommentStore';
import { useAuthStore } from '../../store/authStore';
import { generateInitials, getAvatarUrl } from '../../lib/utils';
import toast from 'react-hot-toast';

interface CommentsModalProps {
  predictionId: string;
  predictionTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  predictionId,
  predictionTitle,
  isOpen,
  onClose,
}) => {
  const { comments, loading, fetchComments, addComment, toggleCommentLike } = useCommentsForPrediction(predictionId);
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && predictionId) {
      fetchComments(predictionId);
    }
  }, [isOpen, predictionId, fetchComments]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addComment(predictionId, newComment.trim());
      setNewComment('');
      toast.success('Comment posted successfully!');
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await unlikeComment(commentId);
      } else {
        await likeComment(commentId);
      }
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="comments-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="modal-overlay"
            onClick={onClose}
            style={{ zIndex: 8000 }}
          />
          
          {/* Modal Content - Match Predict Modal Style */}
          <div className="comment-modal fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 8500, pointerEvents: 'none' }}>
            <motion.div
              key="comments-modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="modal-container w-full max-w-md max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              {/* Header - Match Predict Modal */}
              <div className="modal-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
                      <ArrowLeft size={18} />
                    </Button>
                    <div>
                      <h2 className="font-semibold text-lg text-gray-900">Comments</h2>
                      <p className="text-sm text-gray-500 truncate max-w-[200px]">{predictionTitle}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
                    <X size={18} />
                  </Button>
                </div>
              </div>

              {/* Comments List - Scrollable Area */}
              <div className="modal-body">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No comments yet</h3>
                    <p className="text-gray-500">Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                      >
                        <UserAvatar email={comment.user?.email} username={comment.user?.username} avatarUrl={getAvatarUrl(comment.user)} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-[85%]">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-sm text-gray-900">
                                {comment.user.username}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Input - Always Visible at Bottom */}
              <div className="modal-footer">
                <div className="flex gap-3">
                  <div className="flex-1 flex gap-3">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 text-sm border-gray-200 rounded-full focus:ring-2 focus:ring-green-500/20"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmitting}
                      size="sm"
                      className="rounded-full px-4 bg-green-500 hover:bg-green-600"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};