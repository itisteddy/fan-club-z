import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MessageCircle, Heart, Reply, Send, Image as ImageIcon, Edit3, Flag } from 'lucide-react';
import { useCommentsForPrediction } from '../store/unifiedCommentStore';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import ImageUpload from './common/ImageUpload';
import { ReportModal } from './reporting/ReportModal';

interface CommentSystemProps {
  predictionId: string;
}

// UserAvatar component for consistent avatar display
interface UserAvatarProps {
  user: any;
  size?: 'sm' | 'md' | 'lg';
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
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
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-medium shadow-sm`}>
      {initials}
    </div>
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
    addReply,
    toggleCommentLike,
    clearError
  } = useCommentsForPrediction(predictionId);

  // Local state
  const [newComment, setNewComment] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Refs for focus management
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Reporting state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<{
    contentType: 'prediction' | 'comment' | 'user';
    contentId: string;
    contentTitle?: string;
    contentAuthor?: string;
  } | null>(null);

  // Load comments
  useEffect(() => {
    if (predictionId) {
      fetchComments();
    }
  }, [predictionId, fetchComments]);

  // Auto-expand textarea functionality
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>, setter: (value: string) => void) => {
    setter(e.target.value);
    
    // Auto-expand textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(80, textarea.scrollHeight) + 'px';
  }, []);

  const handleReplyTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    
    // Auto-expand textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(80, textarea.scrollHeight) + 'px';
  }, []);

  // Image handlers
  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageRemove = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  // Reporting functions
  const openReportModal = useCallback((
    contentType: 'prediction' | 'comment' | 'user',
    contentId: string,
    contentTitle?: string,
    contentAuthor?: string
  ) => {
    setReportData({
      contentType,
      contentId,
      contentTitle,
      contentAuthor
    });
    setIsReportModalOpen(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setIsReportModalOpen(false);
    setReportData(null);
  }, []);

  // Comment handlers
  const handleSubmitComment = useCallback(async () => {
    if ((!newComment.trim() && !selectedImage) || !user) return;
    
    try {
      // Submit comment with image if provided
      await addComment(newComment.trim() || 'Image shared', undefined, undefined, selectedImage);
      setNewComment('');
      setSelectedImage(null);
      setImagePreview(null);
      toast.success('Comment added');
    } catch (error: any) {
      console.error('Comment submission error:', error);
      toast.error(error.message || 'Failed to add comment');
    }
  }, [newComment, selectedImage, user, addComment]);

  const handleSubmitReply = useCallback(async (parentId: string) => {
    if (!replyText.trim() || !user) return;
    
    try {
      await addReply(parentId, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
      setReplyingTo(null);
      toast.success('Reply added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add reply');
    }
  }, [replyText, user, addReply]);

  const handleLike = useCallback(async (commentId: string) => {
    try {
      await toggleCommentLike(commentId);
    } catch (error: any) {
      toast.error('Failed to like comment');
    }
  }, [toggleCommentLike]);

  const handleReplyClick = useCallback((commentId: string) => {
    const isOpening = replyingTo !== commentId;
    setReplyingTo(isOpening ? commentId : null);
    setShowReplyInput(isOpening);
    setReplyText('');
    
    // Focus the textarea after state updates and move caret to the end
    if (isOpening) {
      // Use multiple timeouts to ensure DOM updates complete
      setTimeout(() => {
        const el = replyTextareaRef.current;
        if (el) {
          el.focus();
          // Ensure cursor is at the end
          requestAnimationFrame(() => {
            const len = el.value.length;
            try {
              el.setSelectionRange(len, len);
              el.scrollTop = el.scrollHeight;
            } catch (e) {
              console.warn('Could not set cursor position:', e);
            }
          });
        }
      }, 150);
    }
  }, [replyingTo]);

  // Comment item component
  const CommentItem: React.FC<{ comment: any; depth: number }> = ({ comment, depth }) => {
    return (
      <div className={`p-4 ${depth > 0 ? 'ml-4' : ''}`}>
        <div className="flex gap-3">
          <UserAvatar user={comment.user} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-slate-900 dark:text-white">
                {(() => {
                  // Handle different user data structures
                  if (comment.user?.full_name) return comment.user.full_name;
                  if (comment.user?.username) return comment.user.username;
                  if (comment.user_id === user?.id) {
                    // Current user's comment
                    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
                    return fullName || user?.email?.split('@')[0] || 'You';
                  }
                  // Fallback for other users
                  return 'User';
                })()}
              </span>
              {(() => {
                const rawDate = (comment as any).created_at || (comment as any).createdAt || (comment as any).inserted_at;
                const date = rawDate ? new Date(rawDate) : null;
                const isValid = date && !isNaN(date.getTime());
                return isValid ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{date!.toLocaleDateString()}</span>
                ) : null;
              })()}
            </div>
            
            <p className="text-slate-700 dark:text-slate-100 mb-3">{comment.content}</p>
            
            {/* Show image if comment has one */}
            {comment.image_url && (
              <div className="mb-3">
                <img 
                  src={comment.image_url} 
                  alt="Comment attachment" 
                  className="max-w-full h-auto rounded-lg max-h-48 object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => handleLike(comment.id)}
                className={`flex items-center gap-1 transition-colors ${
                  comment.is_liked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
                }`}
                aria-label={`${comment.is_liked ? 'Unlike' : 'Like'} comment by ${comment.user?.username || 'Anonymous'}`}
              >
                <Heart size={16} className={comment.is_liked ? 'fill-current' : ''} />
                <span>{comment.likes_count || 0}</span>
              </button>
              
              <button
                onClick={() => handleReplyClick(comment.id)}
                className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label={`Reply to comment by ${comment.user?.username || 'Anonymous'}`}
              >
                <Reply size={16} />
                <span>Reply</span>
              </button>
              
              <button
                onClick={() => openReportModal('comment', comment.id, comment.content.substring(0, 50) + '...', comment.user?.username)}
                className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors"
                aria-label={`Report comment by ${comment.user?.username || 'Anonymous'}`}
              >
                <Flag size={16} />
                <span>Report</span>
              </button>
              
              {comment.replies_count > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>

            {/* Reply input (nested within comment, single instance) */}
            {showReplyInput && replyingTo === comment.id && (
              <div className="mt-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="space-y-3">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Replying to {comment.user?.username || comment.user?.full_name || 'User'}
                  </div>
                  <textarea
                    ref={replyTextareaRef}
                    value={replyText}
                    onChange={handleReplyTextareaChange}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitReply(comment.id);
                      }
                    }}
                    placeholder={`Write your reply...`}
                    rows={3}
                    className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    style={{ minHeight: '80px' }}
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {replyText.length}/500
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyText.trim() || isSubmitting}
                        className="px-4 py-2 bg-gradient-to-br from-purple-500 to-emerald-600 text-white text-sm rounded-lg hover:from-purple-600 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : null}
                        Reply
                      </button>
                      <button
                        onClick={() => {
                          setShowReplyInput(false);
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-sm rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map((reply: any) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Comment input - clean and prominent */}
      {user ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => handleTextareaChange(e, setNewComment)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              placeholder="Share your thoughts..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none"
              style={{ minHeight: '80px' }}
              disabled={isSubmitting}
              aria-label="Add a comment"
              aria-describedby="comment-help"
            />
            
            <div id="comment-help" className="sr-only">
              Press Enter to submit your comment. Use Shift+Enter for a new line.
            </div>
            
            {/* Image preview */}
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 rounded-lg object-cover shadow-sm"
                />
                <button
                  onClick={handleImageRemove}
                  className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-colors"
                >
                  ×
                </button>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ImageUpload
                  variant="button"
                  onImageSelect={handleImageSelect}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {newComment.length}/500
                </span>
                <button
                  onClick={handleSubmitComment}
                  disabled={(!newComment.trim() && !selectedImage) || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Submit comment"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      Comment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-600">
            Please sign in to join the conversation
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Comments section header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={20} className="text-slate-600" />
        <h3 className="font-semibold text-slate-900">
          Comments ({commentCount})
        </h3>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <MessageCircle size={48} className="text-slate-300 mx-auto mb-4" />
          <h4 className="font-medium text-slate-900 mb-2">No comments yet</h4>
          <p className="text-slate-500 text-sm">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
            />
          ))}
        </div>
      )}

      {/* Report Modal */}
      {reportData && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={closeReportModal}
          contentType={reportData.contentType}
          contentId={reportData.contentId}
          contentTitle={reportData.contentTitle}
          contentAuthor={reportData.contentAuthor}
        />
      )}
    </div>
  );
};

export default CommentSystem;