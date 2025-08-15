import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useComments, useCreateComment, useToggleCommentLike } from '../hooks/useComments';
import { useAuthStore } from '../store/authStore';
import { formatDate, generateInitials } from '@fanclubz/shared';
import type { Comment } from '@fanclubz/shared';

interface EnhancedCommentSystemProps {
  predictionId: string;
}

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  onReply: (commentId: string, content: string) => void;
  onLike: (commentId: string) => void;
  isLiking?: boolean;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const CommentItem: React.FC<CommentItemProps> = React.memo(({ 
  comment, 
  depth = 0, 
  onReply, 
  onLike, 
  isLiking = false 
}) => {
  // Use unique keys for each comment's state to prevent interference
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  
  // Create unique ref for each comment
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const commentId = comment.id;

  const handleReplySubmit = useCallback(() => {
    if (replyContent.trim()) {
      onReply(commentId, replyContent.trim());
      setReplyContent('');
      setShowReplyInput(false);
    }
  }, [replyContent, commentId, onReply]);

  const handleReaction = useCallback((emoji: string) => {
    setSelectedReaction(emoji);
    setShowEmojiPicker(false);
    console.log(`Reacted with ${emoji} to comment ${commentId}`);
  }, [commentId]);

  const handleReplyContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyContent(e.target.value);
  }, []);

  const handleToggleReplyInput = useCallback(() => {
    setShowReplyInput(prev => !prev);
  }, []);

  const handleToggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  const handleLike = useCallback(() => {
    onLike(commentId);
  }, [commentId, onLike]);

  useEffect(() => {
    if (showReplyInput && replyInputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        replyInputRef.current?.focus();
      }, 10);
    }
  }, [showReplyInput]);

  const indentStyle = useMemo(() => ({
    marginLeft: `${Math.min(depth * 24, 48)}px`,
    borderLeft: depth > 0 ? '2px solid #e5e7eb' : 'none',
    paddingLeft: depth > 0 ? '16px' : '0',
  }), [depth]);

  return (
    <div style={indentStyle}>
      <div className="comment-item">
        <div className="comment-header">
          <div className="comment-avatar">
            {comment.user ? 
              generateInitials(comment.user.full_name || comment.user.username) : 
              'U'
            }
          </div>
          <div className="comment-author-info">
            <div className="comment-author">
              {comment.user?.full_name || comment.user?.username || 'Anonymous'}
              {comment.user?.is_verified && (
                <span className="verified-badge" title="Verified user">✓</span>
              )}
            </div>
            <div className="comment-time">
              {formatDate(comment.created_at)}
              {comment.is_edited && (
                <span className="comment-edited">(edited)</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="comment-content">{comment.content}</div>
        
        {/* Reactions Display */}
        {selectedReaction && (
          <div className="comment-reactions">
            <span className="reaction-item active">
              {selectedReaction} 1
            </span>
          </div>
        )}
        
        {/* Comment Actions */}
        <div className="comment-actions">
          <button 
            className={`comment-action-btn ${comment.is_liked ? 'active' : ''}`}
            onClick={handleLike}
            disabled={isLiking}
            type="button"
          >
            <span>👍</span>
            <span>{comment.likes_count || 0}</span>
          </button>
          
          <button 
            className="comment-action-btn"
            onClick={handleToggleReplyInput}
            type="button"
          >
            <span>💬</span>
            <span>Reply</span>
          </button>
          
          <div className="reaction-picker-container">
            <button 
              className="comment-action-btn"
              onClick={handleToggleEmojiPicker}
              type="button"
            >
              <span>😊</span>
              <span>React</span>
            </button>
            
            {showEmojiPicker && (
              <div className="emoji-picker">
                {EMOJI_REACTIONS.map((emoji, index) => (
                  <button
                    key={`${commentId}-emoji-${index}`}
                    className="emoji-option"
                    onClick={() => handleReaction(emoji)}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reply Input */}
        {showReplyInput && (
          <div className="reply-input-container">
            <textarea
              ref={replyInputRef}
              key={`reply-${commentId}`} // Unique key
              placeholder={`Reply to ${comment.user?.username || 'this comment'}...`}
              className="reply-input"
              value={replyContent}
              onChange={handleReplyContentChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReplySubmit();
                }
              }}
              rows={2}
              autoComplete="off"
              spellCheck="false"
            />
            <div className="reply-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleToggleReplyInput}
                type="button"
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleReplySubmit}
                disabled={!replyContent.trim()}
                type="button"
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onLike={onLike}
              isLiking={isLiking}
            />
          ))}
        </div>
      )}
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

const EnhancedCommentSystem: React.FC<EnhancedCommentSystemProps> = ({ predictionId }) => {
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  
  // Create unique ref for main comment input
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Hooks
  const { 
    data: commentsData, 
    isLoading: commentsLoading, 
    error: commentsError,
    refetch
  } = useComments(predictionId, 1, 50);
  
  const createCommentMutation = useCreateComment();
  const toggleLikeMutation = useToggleCommentLike();

  // Memoized callbacks to prevent unnecessary re-renders
  const handleNewCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as 'newest' | 'oldest' | 'popular');
  }, []);

  // Auto-resize textarea for main comment input
  useEffect(() => {
    const textarea = commentInputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [newComment]);

  const handleCreateComment = useCallback(async () => {
    if (!newComment.trim() || createCommentMutation.isPending) return;
    
    if (!user) {
      alert('Please sign in to comment');
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        prediction_id: predictionId,
        content: newComment.trim(),
      });
      
      setNewComment('');
      refetch();
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Failed to post comment. Please try again.');
    }
  }, [newComment, createCommentMutation, user, predictionId, refetch]);

  const handleReply = useCallback(async (parentCommentId: string, content: string) => {
    if (!user) {
      alert('Please sign in to reply');
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        prediction_id: predictionId,
        content: content,
        parent_comment_id: parentCommentId,
      });
      
      refetch();
    } catch (error) {
      console.error('Failed to post reply:', error);
      alert('Failed to post reply. Please try again.');
    }
  }, [user, createCommentMutation, predictionId, refetch]);

  const handleLike = useCallback(async (commentId: string) => {
    if (!user) {
      alert('Please sign in to like comments');
      return;
    }

    try {
      await toggleLikeMutation.mutateAsync(commentId);
      refetch();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }, [user, toggleLikeMutation, refetch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateComment();
    }
  }, [handleCreateComment]);

  const sortedComments = useMemo(() => {
    if (!commentsData?.data) return [];
    
    const comments = [...commentsData.data];
    
    switch (sortBy) {
      case 'newest':
        return comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'popular':
        return comments.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      default:
        return comments;
    }
  }, [commentsData?.data, sortBy]);

  return (
    <div className="enhanced-comment-system">
      {/* Header */}
      <div className="comments-header">
        <div className="comments-title-section">
          <h3 className="comments-title">
            💬 Comments
          </h3>
          {commentsData && (
            <span className="comments-count">
              {commentsData.pagination.total}
            </span>
          )}
        </div>
        
        {/* Sort Options */}
        <div className="comments-sort">
          <select 
            value={sortBy} 
            onChange={handleSortChange}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="popular">Most Liked</option>
          </select>
        </div>
      </div>

      {/* Create Comment */}
      <div className="comment-create-section">
        <div className="comment-input-group">
          <div className="comment-avatar">
            {user ? generateInitials(user.full_name || user.username) : 'U'}
          </div>
          <textarea
            ref={commentInputRef}
            key={`main-comment-${predictionId}`} // Unique key
            placeholder={user ? "Share your thoughts..." : "Sign in to comment"}
            className="comment-input"
            value={newComment}
            onChange={handleNewCommentChange}
            onKeyPress={handleKeyPress}
            disabled={!user || createCommentMutation.isPending}
            rows={1}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        
        <div className="comment-input-actions">
          <div className="character-count">
            <span className={newComment.length > 500 ? 'error' : ''}>
              {newComment.length}/500
            </span>
          </div>
          <button 
            className="btn btn-primary btn-sm"
            onClick={handleCreateComment}
            disabled={!newComment.trim() || createCommentMutation.isPending || !user}
            type="button"
          >
            {createCommentMutation.isPending ? (
              <>
                <span className="loading-spinner">⏳</span>
                Posting...
              </>
            ) : (
              'Comment'
            )}
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="comments-list">
        {commentsLoading && (
          <div className="comments-loading">
            <div className="loading-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-text"></div>
                <div className="skeleton-text short"></div>
              </div>
            </div>
            <div className="loading-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-text"></div>
                <div className="skeleton-text short"></div>
              </div>
            </div>
          </div>
        )}

        {commentsError && !commentsData && (
          <div className="comments-error">
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              Failed to load comments. Please refresh to try again.
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => refetch()}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {sortedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            depth={0}
            onReply={handleReply}
            onLike={handleLike}
            isLiking={toggleLikeMutation.isPending}
          />
        ))}

        {sortedComments.length === 0 && !commentsLoading && !commentsError && (
          <div className="comments-empty">
            <div className="empty-state-icon">💭</div>
            <div className="empty-state-title">No comments yet</div>
            <div className="empty-state-message">
              Be the first to share your thoughts on this prediction!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCommentSystem;