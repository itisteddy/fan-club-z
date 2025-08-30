import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, AlertCircle, RefreshCw } from 'lucide-react';
import EnhancedUserAvatar from '../common/EnhancedUserAvatar';
import EnhancedCommentItem from './EnhancedCommentItem';
import { useAuthStore } from '../../store/authStore';
import { useUnifiedCommentStore, useCommentsForPrediction } from '../../store/unifiedCommentStore';
import { useErrorHandler } from '../../utils/errorHandling';
import ErrorState from '../common/ErrorState';

interface EnhancedCommentSystemProps {
  predictionId: string;
  maxVisible?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

const SKELETON_COUNT = 3;

// Loading skeleton component
const CommentSkeleton: React.FC = () => (
  <div className="p-4 animate-pulse">
    <div className="flex gap-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
        <div className="flex gap-4">
          <div className="h-3 bg-gray-200 rounded w-12" />
          <div className="h-3 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  </div>
);

// Enhanced textarea with auto-resize
const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxRows?: number;
  onSubmit?: () => void;
}> = ({ value, onChange, placeholder, disabled, maxRows = 6, onSubmit }) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }, [onSubmit]);

  const rows = Math.min(Math.max(value.split('\n').length, 1), maxRows);

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm leading-relaxed"
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{ 
        direction: 'ltr', 
        textAlign: 'left',
        unicodeBidi: 'plaintext'
      }}
    />
  );
};

export const EnhancedCommentSystem: React.FC<EnhancedCommentSystemProps> = ({
  predictionId,
  maxVisible = 10,
  autoRefresh = false,
  refreshInterval = 30000,
  className = ''
}) => {
  const { user } = useAuthStore();
  const { handleError, handleSuccess } = useErrorHandler();
  const [newComment, setNewComment] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  
  // Use the enhanced comment store
  const {
    fetchComments,
    addComment,
    editComment,
    deleteComment,
    toggleCommentLike,
    clearError,
    getComments,
    getCommentCount,
    loading,
    errors,
    submitting
  } = useUnifiedCommentStore();
  
  const comments = getComments(predictionId);
  const commentCount = getCommentCount(predictionId);
  const isLoading = loading[predictionId] || false;
  const error = errors[predictionId] || null;
  const isSubmitting = submitting[predictionId] || false;
  
  // Enhanced hook for comments with automatic refresh
  useCommentsForPrediction(predictionId, { autoRefresh, refreshInterval });
  
  // Filter top-level comments (no parent)
  const topLevelComments = useMemo(() => 
    comments.filter(comment => !comment.parent_comment_id),
    [comments]
  );
  
  // Visible comments (with show more/less functionality)
  const visibleComments = useMemo(() => {
    if (showAllComments || topLevelComments.length <= maxVisible) {
      return topLevelComments;
    }
    return topLevelComments.slice(0, maxVisible);
  }, [topLevelComments, showAllComments, maxVisible]);
  
  const hiddenCommentsCount = topLevelComments.length - visibleComments.length;
  
  // Handle new comment submission
  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !user) return;
    
    try {
      await addComment(predictionId, newComment.trim());
      setNewComment('');
      handleSuccess('Comment posted successfully!');
    } catch (error) {
      handleError(error, 'Failed to post comment');
    }
  }, [newComment, user, predictionId, addComment, handleSuccess, handleError]);
  
  // Handle reply to comment
  const handleReply = useCallback(async (parentId: string, content: string) => {
    if (!user) return;
    
    try {
      await addComment(predictionId, content, parentId);
      handleSuccess('Reply posted successfully!');
    } catch (error) {
      handleError(error, 'Failed to post reply');
      throw error; // Re-throw to let component handle UI state
    }
  }, [user, predictionId, addComment, handleSuccess, handleError]);
  
  // Handle comment edit
  const handleEditComment = useCallback(async (commentId: string, content: string) => {
    try {
      await editComment(predictionId, commentId, content);
      handleSuccess('Comment updated successfully!');
    } catch (error) {
      handleError(error, 'Failed to update comment');
      throw error;
    }
  }, [predictionId, editComment, handleSuccess, handleError]);
  
  // Handle comment delete
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteComment(predictionId, commentId);
      handleSuccess('Comment deleted successfully!');
    } catch (error) {
      handleError(error, 'Failed to delete comment');
      throw error;
    }
  }, [predictionId, deleteComment, handleSuccess, handleError]);
  
  // Handle comment like
  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!user) return;
    
    try {
      await toggleCommentLike(commentId, predictionId);
    } catch (error) {
      handleError(error, 'Failed to update like');
      throw error;
    }
  }, [user, predictionId, toggleCommentLike, handleError]);
  
  // Handle comment report
  const handleReportComment = useCallback((commentId: string) => {
    // TODO: Implement reporting functionality
    console.log('Report comment:', commentId);
    handleSuccess('Comment reported. Thank you for helping keep our community safe.');
  }, [handleSuccess]);
  
  // Handle retry
  const handleRetry = useCallback(() => {
    clearError(predictionId);
    fetchComments(predictionId);
  }, [predictionId, clearError, fetchComments]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">
              Comments {commentCount > 0 && `(${commentCount})`}
            </h3>
          </div>
          
          {/* Refresh button for manual refresh */}
          {!autoRefresh && (
            <button
              onClick={() => fetchComments(predictionId)}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh comments"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
      
      {/* Comment Input */}
      {user && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-3">
            <EnhancedUserAvatar
              username={user.username}
              fullName={user.fullName}
              avatarUrl={user.avatarUrl}
              size="md"
            />
            <div className="flex-1">
              <AutoResizeTextarea
                value={newComment}
                onChange={setNewComment}
                placeholder="Share your thoughts..."
                disabled={isSubmitting}
                onSubmit={handleSubmitComment}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500">
                  Press Cmd+Enter to post
                </span>
                <button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Comments List */}
      <div className="min-h-[200px]">
        {error ? (
          <ErrorState
            title="Failed to load comments"
            message={error}
            onRetry={handleRetry}
            variant="inline"
            className="m-4"
          />
        ) : isLoading && comments.length === 0 ? (
          // Loading skeletons
          <div className="divide-y divide-gray-100">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <CommentSkeleton key={i} />
            ))}
          </div>
        ) : comments.length === 0 ? (
          // Empty state
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-1">No comments yet</h4>
            <p className="text-gray-500 text-sm">
              {user ? 'Be the first to share your thoughts!' : 'Sign in to join the conversation.'}
            </p>
          </div>
        ) : (
          // Comments
          <div className="divide-y divide-gray-100">
            <AnimatePresence initial={false}>
              {visibleComments.map((comment) => (
                <EnhancedCommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onLike={handleLikeComment}
                  onReport={handleReportComment}
                  isReplying={isSubmitting}
                  isLiking={false}
                  isEditing={false}
                  isDeleting={false}
                />
              ))}
            </AnimatePresence>
            
            {/* Show more/less comments */}
            {hiddenCommentsCount > 0 && (
              <div className="p-4 text-center border-t border-gray-100">
                <button
                  onClick={() => setShowAllComments(true)}
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                >
                  Show {hiddenCommentsCount} more comments
                </button>
              </div>
            )}
            
            {showAllComments && topLevelComments.length > maxVisible && (
              <div className="p-4 text-center border-t border-gray-100">
                <button
                  onClick={() => setShowAllComments(false)}
                  className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                >
                  Show fewer comments
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Loading indicator for additional operations */}
      {isLoading && comments.length > 0 && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default React.memo(EnhancedCommentSystem);
