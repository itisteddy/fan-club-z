import React, { useState, useRef } from 'react';
import { Comment } from '../../store/unifiedCommentStore';
import { useAuthStore } from '../../store/authStore';
import CommentOverflowMenu from './CommentOverflowMenu';
import { formatDistanceToNow } from 'date-fns';
import { qaLog } from '../../utils/devQa';
import { OGBadge } from '../badges/OGBadge';

interface CommentItemProps {
  comment: Comment;
  highlighted?: boolean;
  onEdit?: (commentId: string, newText: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onLikeToggle?: (commentId: string) => Promise<void>;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  highlighted = false,
  onEdit,
  onDelete,
  onLikeToggle,
}) => {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = user?.id === comment.user.id;
  
  // Get OG badge from comment user data
  const ogBadge = (comment.user as any)?.og_badge || (comment.user as any)?.ogBadge || null;

  // Handle edit mode
  const handleEditStart = () => {
    qaLog(`Starting edit for comment ${comment.id}`);
    setIsEditing(true);
    setEditText(comment.text);
    
    // Focus textarea after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }, 0);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditText(comment.text);
  };

  const handleEditSubmit = async () => {
    const trimmedText = editText.trim();
    if (!trimmedText || trimmedText === comment.text) {
      handleEditCancel();
      return;
    }

    if (trimmedText.length > 280) {
      // Could show validation error here
      return;
    }

    setIsSubmitting(true);
    try {
      await onEdit?.(comment.id, trimmedText);
      setIsEditing(false);
      qaLog(`Comment ${comment.id} edited successfully`);
    } catch (error) {
      qaLog(`Failed to edit comment ${comment.id}:`, error);
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts in edit mode
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await onDelete?.(comment.id);
      qaLog(`Comment ${comment.id} deleted successfully`);
    } catch (error) {
      qaLog(`Failed to delete comment ${comment.id}:`, error);
      // Error is handled by parent component
    }
  };

  // Handle report (placeholder)
  const handleReport = () => {
    qaLog(`Reporting comment ${comment.id}`);
    // This could open a report modal or send an analytics event
    // For now, just log the event
  };

  // Handle username click
  const handleUsernameClick = () => {
    // Could navigate to user profile
    qaLog(`Username clicked: ${comment.user.username}`);
  };

  // Auto-grow textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { 
    addSuffix: true 
  });

  // Handle deleted comments
  if (comment.isDeleted) {
    return (
      <div className="comment-item">
        <div className="comment-avatar" />
        <div className="comment-content">
          <div className="comment-deleted">
            Comment deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`comment-item ${highlighted ? 'highlighted' : ''}`}
      role="listitem"
      id={`comment-${comment.id}`}
    >
      {/* Avatar */}
      <div className="comment-avatar">
        {comment.user.avatarUrl ? (
          <img 
            src={comment.user.avatarUrl} 
            alt={comment.user.username}
            className="w-full h-full object-cover rounded-inherit"
          />
        ) : (
          comment.user.username.charAt(0).toUpperCase()
        )}
      </div>

      {/* Content */}
      <div className="comment-content">
        {/* Header */}
        <div className="comment-header">
          <div className="flex items-center gap-1.5">
            <button
              className="comment-username"
              onClick={handleUsernameClick}
              type="button"
            >
              {comment.user.username}
            </button>
            {/* OG Badge next to username */}
            <OGBadge tier={ogBadge} size="xs" />
          </div>
          <span className="comment-timestamp">
            {timeAgo}
            {comment.edited && <span className="ml-1">(edited)</span>}
          </span>
        </div>

        {/* Body - Edit mode or display */}
        {isEditing ? (
          <div className="mt-2">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={handleTextareaChange}
              onKeyDown={handleEditKeyDown}
              className="comment-textarea"
              disabled={isSubmitting}
              maxLength={280}
              rows={1}
              style={{ minHeight: '60px', maxHeight: '120px' }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs ${editText.length > 260 ? 'text-amber-600' : editText.length > 280 ? 'text-red-600' : 'text-gray-500'}`}>
                {editText.length}/280
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleEditCancel}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  disabled={isSubmitting || !editText.trim() || editText.length > 280}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="comment-body">
            {comment.text}
          </div>
        )}

        {/* Actions - only show overflow menu if not editing */}
        {!isEditing && (
          <div className="comment-actions">
            <CommentOverflowMenu
              isOwner={isOwner}
              onEdit={isOwner && onEdit ? handleEditStart : undefined}
              onDelete={isOwner && onDelete ? handleDelete : undefined}
              onReport={!isOwner ? handleReport : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
