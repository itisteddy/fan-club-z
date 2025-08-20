import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Heart, Send } from 'lucide-react';
import { useCommentsForPrediction } from '../../store/unifiedCommentStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import type { Prediction } from '../../store/predictionStore';
import TappableUsername from '../TappableUsername';

interface CommentModalProps {
  prediction: Prediction | null;
  isOpen: boolean;
  onClose: () => void;
}

// Error boundary component for modal content
const ModalErrorBoundary: React.FC<{ 
  children: React.ReactNode; 
  onClose: () => void;
  error?: string;
}> = ({ children, onClose, error }) => {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9000]"
      >
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="text-red-600 text-center">
            <h3 className="font-semibold mb-2">⚠️ Error</h3>
            <p className="text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
};

const CommentModal: React.FC<CommentModalProps> = ({
  prediction,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [mounted, setMounted] = useState(false);

  // Effect to handle mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Early validation
  const validPrediction = prediction && prediction.id && prediction.id.trim() !== '';
  const shouldFetchComments = isOpen && validPrediction && mounted;

  // Only call the hook if we have a valid prediction ID and modal is open
  const {
    comments,
    commentCount,
    isLoading: loading,
    error,
    isSubmitting,
    fetchComments,
    addComment,
    toggleCommentLike,
    clearError
  } = useCommentsForPrediction(shouldFetchComments ? prediction!.id : '');

  // Handle fetching comments when modal opens
  useEffect(() => {
    if (shouldFetchComments) {
      fetchComments();
    }
  }, [shouldFetchComments, fetchComments]);

  // Handle modal close cleanup
  useEffect(() => {
    if (!isOpen) {
      setNewComment('');
      if (validPrediction) {
        clearError();
      }
    }
  }, [isOpen, clearError, validPrediction]);

  const handleSubmitComment = async () => {
    if (!validPrediction || !newComment.trim() || !user) {
      return;
    }

    try {
      await addComment(newComment.trim());
      setNewComment('');
      toast.success('Comment added successfully!');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error.message || 'Failed to add comment');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!validPrediction) {
      return;
    }

    try {
      await toggleCommentLike(commentId);
    } catch (error: any) {
      console.error('Failed to toggle comment like:', error);
      toast.error('Failed to update like');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = new Date();
      const commentDate = new Date(dateString);
      const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    } catch (err) {
      return 'Recently';
    }
  };

  // Don't render if not mounted yet
  if (!mounted) {
    return null;
  }

  // Validation for modal opening
  if (isOpen && !validPrediction) {
    return (
      <ModalErrorBoundary 
        onClose={onClose}
        error="Unable to load comments. Invalid prediction data."
      />
    );
  }

  // Don't render if modal is not open or prediction is invalid
  if (!isOpen || !prediction) {
    return null;
  }

  return (
    <AnimatePresence>
      <ModalErrorBoundary onClose={onClose}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center sm:items-center sm:p-4 z-[9000]"
        >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[80vh]"
            style={{ zIndex: 9001 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <MessageCircle size={20} className="text-blue-500" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Comments</h2>
                  <p className="text-sm text-gray-600">
                    {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Prediction Info */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-1">
                {prediction.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {prediction.description || 'No description available'}
              </p>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto">
              {loading && comments.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <MessageCircle size={48} className="text-red-300 mx-auto mb-3" />
                  <p className="text-red-600 font-medium">Failed to load comments</p>
                  <p className="text-sm text-red-400 mb-4">{error}</p>
                  <button
                    onClick={() => fetchComments()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Try Again
                  </button>
                </div>
              ) : comments.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No comments yet</p>
                  <p className="text-sm text-gray-400">Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {comment.user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <TappableUsername 
                              username={comment.user?.username || 'Anonymous'}
                              userId={comment.user?.id || 'anonymous'}
                              className="font-semibold text-gray-900 text-sm hover:text-blue-600"
                              showAt={false}
                            />
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-800 text-sm leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-2 ml-4">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              comment.is_liked
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart 
                              size={14} 
                              fill={comment.is_liked ? 'currentColor' : 'none'}
                            />
                            {comment.likes_count > 0 && (
                              <span>{comment.likes_count}</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Input */}
            {user ? (
              <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {user.firstName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:ring-2 focus:ring-green-500 focus:bg-white focus:outline-none transition-all text-sm"
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmitting}
                      className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                <p className="text-gray-600 text-sm">
                  Please log in to join the conversation
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </ModalErrorBoundary>
    </AnimatePresence>
  );
};

export default CommentModal;