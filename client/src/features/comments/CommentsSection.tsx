import React, { useEffect, useCallback, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useUnifiedCommentStore } from '../../store/unifiedCommentStore';
import { CommentInput } from './CommentInput';
import { CommentList } from './CommentList';
import toast from 'react-hot-toast';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { ReportContentModal } from '../../components/ugc/ReportContentModal';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';

interface CommentsSectionProps {
  predictionId: string;
  predictionTitle?: string;
  className?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  predictionId,
  predictionTitle,
  className = ''
}) => {
  const {
    getComments,
    getCommentCount,
    getStatus,
    isPosting: isPostingFn,
    hasMore: hasMoreFn,
    fetchComments,
    loadMore,
    addComment,
    retryComment,
    dismissFailedComment,
    editComment,
    deleteComment,
    toggleLike,
  } = useUnifiedCommentStore();
  const { session } = useAuthSession();
  const { blockedUserIds, blockUser, isBlocked } = useBlockedUsers();
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportNonce, setReportNonce] = useState(0);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [pendingBlockUserId, setPendingBlockUserId] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const menuOpenedAtRef = useRef(0);
  const menuOpenScrollPosRef = useRef({ x: 0, y: 0 });

  const predictionComments = getComments(predictionId);
  const predictionStatus = getStatus(predictionId);
  const predictionPosting = isPostingFn(predictionId);
  const predictionHasMore = hasMoreFn(predictionId);

  // Fetch comments on mount (and when prediction changes).
  // We intentionally do NOT gate on status==='idle' because stale empty data
  // can otherwise stick around across deploys/navigation.
  useEffect(() => {
    if (!predictionId) return;
    fetchComments(predictionId).catch((error) => {
      if (error?.status >= 500) {
        toast.error('Failed to load comments. Please try again.');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictionId]);

  // Handle adding new comments
  const handleAddComment = useCallback(async (text: string) => {
    try {
      await addComment(predictionId, text);
    } catch (error: any) {
      // Don't toast generic "failed" — the inline failed state handles it.
      // Only toast for auth/account errors that need immediate attention.
      const status = error?.status;
      if (status === 401 || status === 403 || status === 409) {
        toast.error(error?.message || 'Unable to comment.');
      }
      // Error propagated so CommentInput can handle UI
      throw error;
    }
  }, [addComment, predictionId]);

  // Retry a failed comment
  const handleRetry = useCallback(async (clientTempId: string) => {
    try {
      await retryComment(predictionId, clientTempId);
    } catch (error: any) {
      const status = error?.status;
      if (status === 401 || status === 403 || status === 409) {
        toast.error(error?.message || 'Unable to comment.');
      }
      // Failed again — store keeps it as failed with updated message
    }
  }, [retryComment, predictionId]);

  // Dismiss a failed comment
  const handleDismiss = useCallback((clientTempId: string) => {
    dismissFailedComment(predictionId, clientTempId);
  }, [dismissFailedComment, predictionId]);

  // Handle like toggle
  const handleToggleLike = useCallback(async (_commentId: string) => {
    try {
      await toggleLike(predictionId, _commentId);
    } catch (error: any) {
      const status = error?.status;
      if (status === 401 || status === 403) {
        toast.error(error?.message || 'Please sign in to like comments.');
      }
    }
  }, [toggleLike, predictionId]);

  const handleEdit = useCallback(async (commentId: string, text: string) => {
    try {
      await editComment(predictionId, commentId, text);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to edit comment.');
      throw error;
    }
  }, [editComment, predictionId]);

  const handleDelete = useCallback(async (commentId: string) => {
    try {
      await deleteComment(predictionId, commentId);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete comment.');
      throw error;
    }
  }, [deleteComment, predictionId]);

  const handleReply = useCallback(async (parentCommentId: string, text: string) => {
    try {
      await addComment(predictionId, text, parentCommentId);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reply.');
      throw error;
    }
  }, [addComment, predictionId]);

  const handleReport = useCallback((commentId: string) => {
    if (!session?.access_token) {
      toast.error('Please sign in to report content.');
      return;
    }
    setReportTargetId(commentId);
  }, [session?.access_token]);

  const handleBlockUser = useCallback((userId: string) => {
    if (!userId || isBlocked(userId)) return;
    setPendingBlockUserId(userId);
  }, [isBlocked]);

  const handleConfirmBlockUser = useCallback(async () => {
    if (!pendingBlockUserId) return;
    setIsBlocking(true);
    try {
      const result = await blockUser(pendingBlockUserId);
      if (result.ok) {
        toast.success('User blocked. Content removed.');
        setPendingBlockUserId(null);
      } else {
        toast.error(result.message || 'Failed to block user.');
      }
    } finally {
      setIsBlocking(false);
    }
  }, [blockUser, pendingBlockUserId]);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    try {
      await loadMore(predictionId);
    } catch (error: any) {
      if (error?.status >= 500) {
        toast.error('Failed to load more comments.');
      }
    }
  }, [loadMore, predictionId]);

  const handleCloseMenu = useCallback(() => {
    setOpenMenuCommentId(null);
  }, []);

  const handleOpenMenu = useCallback((commentId: string) => {
    menuOpenedAtRef.current = Date.now();
    menuOpenScrollPosRef.current = {
      x: window.scrollX,
      y: window.scrollY,
    };
    setOpenMenuCommentId(commentId);
  }, []);

  useEffect(() => {
    if (!openMenuCommentId) return;
    const MIN_OPEN_MS = 700;
    const isMobileViewport =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches;
    const shouldCloseNow = () => Date.now() - menuOpenedAtRef.current > MIN_OPEN_MS;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleCloseMenu();
    };
    const handleScroll = () => {
      if (isMobileViewport) return;
      // Some mobile browsers emit scroll events during taps/touch adjustments.
      // Close only when the viewport actually moved to avoid dropping menu-item clicks.
      const dx = Math.abs(window.scrollX - menuOpenScrollPosRef.current.x);
      const dy = Math.abs(window.scrollY - menuOpenScrollPosRef.current.y);
      const didScroll = dx > 8 || dy > 8;
      if (didScroll && shouldCloseNow()) handleCloseMenu();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [openMenuCommentId, handleCloseMenu]);

  const isLoading = predictionStatus === 'loading' || predictionStatus === 'paginating';
  const showCount = getCommentCount(predictionId);

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        <MessageSquare className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">
          Comments {showCount > 0 && `(${showCount})`}
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Comment Input */}
        <CommentInput
          predictionId={predictionId}
          onSubmit={handleAddComment}
          isPosting={predictionPosting}
        />

        {/* Comments List */}
        <CommentList
          comments={predictionComments}
          isLoading={isLoading}
          hasMore={predictionHasMore}
          onLoadMore={handleLoadMore}
          onToggleLike={handleToggleLike}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReply={handleReply}
          onReport={handleReport}
          onBlockUser={handleBlockUser}
          blockedUserIds={blockedUserIds}
          reportNonce={reportNonce}
              predictionTitle={predictionTitle}
              openMenuCommentId={openMenuCommentId}
              onOpenMenu={handleOpenMenu}
              onCloseMenu={handleCloseMenu}
            />
      </div>

      <ReportContentModal
        open={!!reportTargetId}
        targetType="comment"
        targetId={reportTargetId || ''}
        label="this comment"
        accessToken={session?.access_token}
        onClose={() => setReportTargetId(null)}
        onSuccess={() => setReportNonce((n) => n + 1)}
      />

      <ConfirmationModal
        isOpen={!!pendingBlockUserId}
        onClose={() => setPendingBlockUserId(null)}
        onConfirm={handleConfirmBlockUser}
        title="Block this user?"
        message="You won’t see their content anymore."
        confirmText="Block"
        cancelText="Cancel"
        variant="danger"
        isLoading={isBlocking}
      />
    </div>
  );
};
