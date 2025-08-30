import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MessageCircle, 
  Heart, 
  Send, 
  Reply, 
  User, 
  Image as ImageIcon,
  Paperclip,
  Smile,
  MoreHorizontal
} from 'lucide-react';
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

// Clean, minimal user avatar component
const UserAvatar: React.FC<{ 
  user: any; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ user, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.full_name || user?.username || 'Anonymous';
  const initials = getInitials(displayName);

  return (
    <div className={`${sizeClasses[size]} ${className} bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-medium shadow-sm`}>
      {initials}
    </div>
  );
};

// Image upload component
const ImageUpload: React.FC<{
  onImageSelect: (file: File) => void;
  disabled?: boolean;
}> = ({ onImageSelect, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }

      onImageSelect(file);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="p-2 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach image"
      >
        <ImageIcon size={18} />
      </button>
    </>
  );
};

// Clean comment item component
const CommentItem: React.FC<{
  comment: any;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, content: string) => void;
  depth?: number;
  onClose: () => void;
}> = ({ comment, onLike, onReply, depth = 0, onClose }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const { user } = useAuthStore();

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !user) return;

    setIsSubmittingReply(true);
    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setIsReplying(false);
      toast.success('Reply added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = new Date();
      const commentDate = new Date(dateString);
      const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
      return `${Math.floor(diffInSeconds / 86400)}d`;
    } catch (err) {
      return 'Recently';
    }
  };

  const maxDepth = 3;
  const canReply = depth < maxDepth && user;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group ${depth > 0 ? 'ml-8' : ''}`}
    >
      <div className="flex gap-3 py-3">
        <UserAvatar user={comment.user} size="md" />
        
        <div className="flex-1 min-w-0">
          {/* Comment header */}
          <div className="flex items-center gap-2 mb-1">
            <TappableUsername 
              username={comment.user?.username || 'Anonymous'}
              userId={comment.user?.id || 'anonymous'}
              className="font-medium text-slate-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              showAt={false}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatTimeAgo(comment.created_at)}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-slate-400 dark:text-slate-500">(edited)</span>
            )}
          </div>
          
          {/* Comment content */}
          <div className="mb-2">
            <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
              {comment.content}
            </p>
            
            {/* Comment image if present */}
            {comment.image_url && (
              <div className="mt-2">
                <img 
                  src={comment.image_url} 
                  alt="Comment attachment"
                  className="rounded-lg max-w-full max-h-48 object-cover shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Reply to username if it's a reply */}
          {comment.reply_to && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Replying to <span className="font-medium">@{comment.reply_to}</span>
            </div>
          )}

          {/* Action buttons - clean and minimal */}
          <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                comment.is_liked
                  ? 'text-red-500'
                  : 'text-slate-500 hover:text-red-500'
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

            {canReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Reply size={14} />
                Reply
              </button>
            )}

            {comment.replies_count > 0 && (
              <span className="text-xs text-slate-400">
                {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>

          {/* Reply input - clean design */}
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitReply();
                    }
                  }}
                  placeholder={`Reply to ${comment.user?.username || 'Anonymous'}...`}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  disabled={isSubmittingReply}
                />
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || isSubmittingReply}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isSubmittingReply ? 'Sending...' : 'Reply'}
                </button>
                <button
                  onClick={() => setIsReplying(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {comment.replies.map((reply: any) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onLike={onLike}
                  onReply={onReply}
                  depth={depth + 1}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Error boundary component
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
        <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={24} className="text-red-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Error</h3>
            <p className="text-sm text-slate-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validPrediction = prediction && prediction.id && prediction.id.trim() !== '';
  const shouldFetchComments = isOpen && validPrediction && mounted;

  const {
    comments,
    commentCount,
    isLoading: loading,
    error,
    isSubmitting,
    fetchComments,
    addComment,
    addReply,
    toggleCommentLike,
    clearError
  } = useCommentsForPrediction(shouldFetchComments ? prediction!.id : '');

  useEffect(() => {
    if (shouldFetchComments) {
      fetchComments();
    }
  }, [shouldFetchComments, fetchComments]);

  useEffect(() => {
    if (!isOpen) {
      setNewComment('');
      setSelectedImage(null);
      setImagePreview(null);
      if (validPrediction) {
        clearError();
      }
    }
  }, [isOpen, clearError, validPrediction]);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmitComment = async () => {
    if (!validPrediction || (!newComment.trim() && !selectedImage) || !user) {
      return;
    }

    try {
      // Submit comment with image if provided
      await addComment(newComment.trim() || 'Image shared', undefined, undefined, selectedImage);
      setNewComment('');
      setSelectedImage(null);
      setImagePreview(null);
      toast.success('Comment added');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error.message || 'Failed to add comment');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!validPrediction) return;

    try {
      await toggleCommentLike(commentId);
    } catch (error: any) {
      console.error('Failed to toggle comment like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleReplyToComment = async (commentId: string, content: string) => {
    if (!validPrediction || !content.trim() || !user) return;

    try {
      await addReply(commentId, content.trim());
      toast.success('Reply added');
    } catch (error: any) {
      console.error('Failed to add reply:', error);
      toast.error(error.message || 'Failed to add reply');
    }
  };

  if (!mounted) return null;

  if (isOpen && !validPrediction) {
    return (
      <ModalErrorBoundary onClose={onClose}>
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={24} className="text-red-500" />
          </div>
          <p className="text-slate-900 font-medium mb-2">Unable to load comments</p>
          <p className="text-sm text-slate-500">Invalid prediction data.</p>
        </div>
      </ModalErrorBoundary>
    );
  }

  if (!isOpen || !prediction) return null;

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
            className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-2xl"
            style={{ zIndex: 9001 }}
          >
            {/* Clean header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <MessageCircle size={20} className="text-blue-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Comments</h2>
                  <p className="text-sm text-slate-500">
                    {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>

            {/* Prediction info - clean design */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-medium text-slate-900 mb-1 line-clamp-1">
                {prediction.title}
              </h3>
              <p className="text-sm text-slate-600 line-clamp-2">
                {prediction.description || 'No description available'}
              </p>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto">
              {loading && comments.length === 0 ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle size={24} className="text-red-500" />
                  </div>
                  <p className="text-slate-900 font-medium mb-2">Failed to load comments</p>
                  <p className="text-sm text-slate-500 mb-4">{error}</p>
                  <button
                    onClick={() => fetchComments()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : comments.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle size={24} className="text-slate-400" />
                  </div>
                  <p className="text-slate-900 font-medium mb-2">No comments yet</p>
                  <p className="text-sm text-slate-500">Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="px-6 py-4 space-y-1">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onLike={handleLikeComment}
                      onReply={handleReplyToComment}
                      onClose={onClose}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Clean comment input */}
            {user ? (
              <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0">
                {/* Image preview */}
                {imagePreview && (
                  <div className="mb-3 relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="rounded-lg max-h-32 object-cover"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <UserAvatar user={user} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
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
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        disabled={isSubmitting}
                      />
                      <ImageUpload 
                        onImageSelect={handleImageSelect}
                        disabled={isSubmitting}
                      />
                      <button
                        onClick={handleSubmitComment}
                        disabled={(!newComment.trim() && !selectedImage) || isSubmitting}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {isSubmitting ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-slate-600 text-sm">
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