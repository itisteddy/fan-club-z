import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useCommentStore, type Comment } from '../../store/commentStore';
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
  const { comments, loading, fetchComments, addComment, likeComment, unlikeComment } = useCommentStore();
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
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Modal Content - Twitter/iMessage Style */}
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              key="comments-modal-content"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Twitter Style */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
                    <ArrowLeft size={18} />
                  </Button>
                  <div>
                    <h2 className="font-semibold text-gray-900">Comments</h2>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{predictionTitle}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
                  <X size={18} />
                </Button>
              </div>

              {/* Comments List - iMessage Style */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No comments yet</h3>
                    <p className="text-gray-500">Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={getAvatarUrl(comment.user)} />
                            <AvatarFallback className="text-xs">
                              {generateInitials(comment.user.username)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Comment Content - iMessage Bubble */}
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-100 rounded-2xl px-3 py-2 max-w-[85%]">
                            <div className="flex items-center gap-2 mb-1">
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
                          
                          {/* Comment Actions - Twitter Style */}
                          <div className="flex items-center gap-4 mt-2 ml-1">
                            <button
                              onClick={() => handleLikeComment(comment.id, comment.is_liked_by_user)}
                              className={`flex items-center gap-1 text-xs transition-colors ${
                                comment.is_liked_by_user 
                                  ? 'text-red-500' 
                                  : 'text-gray-500 hover:text-red-500'
                              }`}
                            >
                              <Heart size={12} className={comment.is_liked_by_user ? 'fill-current' : ''} />
                              {comment.likes_count > 0 && comment.likes_count}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Input - Twitter Style */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={user ? getAvatarUrl(user) : undefined} />
                    <AvatarFallback className="text-xs">
                      {user ? generateInitials(user.firstName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 text-sm border-gray-200 rounded-full focus:ring-2 focus:ring-primary/20"
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
                      className="rounded-full px-4"
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
