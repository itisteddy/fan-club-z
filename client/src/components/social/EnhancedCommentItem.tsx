import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Reply, MoreHorizontal, Edit3, Trash2, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedUserAvatar from '../common/EnhancedUserAvatar';
import { useAuthStore } from '../../store/authStore';
import { UnifiedComment } from '../../store/unifiedCommentStore';

interface EnhancedCommentItemProps {
  comment: UnifiedComment;
  depth?: number;
  maxDepth?: number;
  onReply?: (parentId: string, content: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onLike?: (commentId: string) => Promise<void>;
  onReport?: (commentId: string) => void;
  isReplying?: boolean;
  isLiking?: boolean;
  isEditing?: boolean;
  isDeleting?: boolean;
  className?: string;
}

const MAX_DEPTH = 3;
const COLLAPSED_REPLIES_LIMIT = 3;

export const EnhancedCommentItem: React.FC<EnhancedCommentItemProps> = ({
  comment,
  depth = 0,
  maxDepth = MAX_DEPTH,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onReport,
  isReplying = false,
  isLiking = false,
  isEditing = false,
  isDeleting = false,
  className = ''
}) => {
  const { user } = useAuthStore();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [isEditMode, setIsEditMode] = useState(false);
  const [optimisticLike, setOptimisticLike] = useState<boolean | null>(null);
  
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  
  const isOwner = user?.id === comment.user_id;
  const canReply = user && depth < maxDepth;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const shouldShowCollapsedReplies = hasReplies && comment.replies!.length > COLLAPSED_REPLIES_LIMIT;
  const visibleReplies = shouldShowCollapsedReplies && !showAllReplies 
    ? comment.replies!.slice(0, COLLAPSED_REPLIES_LIMIT)
    : comment.replies || [];
  
  // Optimistic like state
  const displayLiked = optimisticLike !== null ? optimisticLike : comment.is_liked;
  const displayLikesCount = comment.likes_count + (optimisticLike === true && !comment.is_liked ? 1 : 0) - (optimisticLike === false && comment.is_liked ? 1 : 0);
  
  // Indentation based on depth
  const indentStyle = useMemo(() => ({
    marginLeft: `${Math.min(depth * 16, 48)}px`,
  }), [depth]);
  
  // Handle reply submission
  const handleReplySubmit = useCallback(async () => {
    if (!replyContent.trim() || !onReply) return;
    
    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setShowReplyInput(false);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  }, [replyContent, onReply, comment.id]);
  
  // Handle edit submission
  const handleEditSubmit = useCallback(async () => {
    if (!editContent.trim() || !onEdit || editContent === comment.content) {
      setIsEditMode(false);
      return;
    }
    
    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to edit comment:', error);
      setEditContent(comment.content); // Reset on error
    }
  }, [editContent, onEdit, comment.id, comment.content]);
  
  // Handle like with optimistic update
  const handleLike = useCallback(async () => {
    if (!onLike || isLiking) return;
    
    // Optimistic update
    setOptimisticLike(!displayLiked);
    
    try {
      await onLike(comment.id);
      setOptimisticLike(null); // Clear optimistic state on success
    } catch (error) {
      console.error('Failed to like comment:', error);
      setOptimisticLike(null); // Revert on error
    }
  }, [onLike, comment.id, displayLiked, isLiking]);
  
  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!onDelete || !window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  }, [onDelete, comment.id]);
  
  // Auto-focus inputs
  useEffect(() => {
    if (showReplyInput && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [showReplyInput]);
  
  useEffect(() => {
    if (isEditMode && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditMode, editContent]);
  
  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    
    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showOptionsMenu]);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`relative ${className}`}
      style={depth > 0 ? indentStyle : undefined}
    >
      {/* Thread indicator line for nested comments */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" style={{ left: '-8px' }} />
      )}
      
      <div className={`p-4 ${depth > 0 ? 'border-l-2 border-gray-100 pl-6' : ''}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <EnhancedUserAvatar
              username={comment.user.username}
              fullName={comment.user.full_name}
              avatarUrl={comment.user.avatar_url}
              isVerified={comment.user.is_verified}
              size={depth > 1 ? 'sm' : 'md'}
              showVerificationBadge={true}
            />
          </div>
          
          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900 truncate">
                {comment.user.full_name || comment.user.username}
              </span>
              {comment.user.is_verified && (
                <span className="text-blue-500 text-xs">✓</span>
              )}
              <span className="text-xs text-gray-500" title={new Date(comment.created_at).toLocaleString()}>
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
            
            {/* Content */}
            {isEditMode ? (
              <div className="mb-3">
                <textarea
                  ref={editInputRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  rows={Math.min(Math.max(editContent.split('\n').length, 2), 6)}
                  placeholder="Edit your comment..."
                  disabled={isEditing}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleEditSubmit}
                    disabled={isEditing || !editContent.trim()}
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEditing ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setEditContent(comment.content);
                    }}
                    disabled={isEditing}
                    className="px-3 py-1 text-gray-600 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-900 mb-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {comment.content}
              </p>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-4 text-sm">
              {/* Like button */}
              <button
                onClick={handleLike}
                disabled={!user || isLiking}
                className={`
                  flex items-center gap-1 transition-colors
                  ${displayLiked 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-500 hover:text-red-500'
                  }
                  ${!user ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                `}
                title={user ? (displayLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
              >
                <Heart size={14} className={displayLiked ? 'fill-current' : ''} />
                <span className="font-medium">{displayLikesCount}</span>
              </button>
              
              {/* Reply button */}
              {canReply && (
                <button
                  onClick={() => setShowReplyInput(!showReplyInput)}
                  disabled={isReplying}
                  className="flex items-center gap-1 text-gray-500 hover:text-purple-500 transition-colors"
                >
                  <Reply size={14} />
                  <span>Reply</span>
                </button>
              )}
              
              {/* Options menu */}
              {(isOwner || user) && (
                <div className="relative" ref={optionsMenuRef}>
                  <button
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  
                  <AnimatePresence>
                    {showOptionsMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]"
                      >
                        {isOwner && (
                          <>
                            <button
                              onClick={() => {
                                setIsEditMode(true);
                                setShowOptionsMenu(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete();
                                setShowOptionsMenu(false);
                              }}
                              disabled={isDeleting}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={12} />
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          </>
                        )}
                        {!isOwner && user && onReport && (
                          <button
                            onClick={() => {
                              onReport(comment.id);
                              setShowOptionsMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                          >
                            <Flag size={12} />
                            Report
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            
            {/* Reply Input */}
            <AnimatePresence>
              {showReplyInput && canReply && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pl-2"
                >
                  <div className="flex gap-2">
                    <EnhancedUserAvatar
                      username={user?.username}
                      fullName={user?.fullName}
                      avatarUrl={user?.avatarUrl}
                      size="sm"
                    />
                    <div className="flex-1">
                      <textarea
                        ref={replyInputRef}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        rows={2}
                        placeholder={`Reply to ${comment.user.full_name || comment.user.username}...`}
                        disabled={isReplying}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={handleReplySubmit}
                          disabled={isReplying || !replyContent.trim()}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isReplying ? 'Replying...' : 'Reply'}
                        </button>
                        <button
                          onClick={() => {
                            setShowReplyInput(false);
                            setReplyContent('');
                          }}
                          disabled={isReplying}
                          className="px-3 py-1 text-gray-600 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Replies */}
        {hasReplies && (
          <div className="mt-3">
            <AnimatePresence>
              {visibleReplies.map((reply) => (
                <EnhancedCommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onLike={onLike}
                  onReport={onReport}
                  isReplying={isReplying}
                  isLiking={isLiking}
                  isEditing={isEditing}
                  isDeleting={isDeleting}
                />
              ))}
            </AnimatePresence>
            
            {/* Show more replies button */}
            {shouldShowCollapsedReplies && (
              <button
                onClick={() => setShowAllReplies(!showAllReplies)}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                {showAllReplies 
                  ? 'Show fewer replies' 
                  : `Show ${comment.replies!.length - COLLAPSED_REPLIES_LIMIT} more replies`
                }
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(EnhancedCommentItem);
