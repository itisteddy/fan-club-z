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
import { normalizeCommentTargetId } from '@/lib/commentDeepLink';
import { unsuppressScrollToTop } from '@/utils/scroll';

interface CommentsSectionProps {
  predictionId: string;
  predictionTitle?: string;
  className?: string;
  deepLinkCommentId?: string | null;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  predictionId,
  predictionTitle,
  className = '',
  deepLinkCommentId = null,
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
    setHighlighted,
    fetchCommentById,
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
  const highlightedId = useUnifiedCommentStore((s) => s.byPrediction[predictionId]?.highlightedId);
  const [deepLinkStatus, setDeepLinkStatus] = useState<'idle' | 'locating' | 'missing'>('idle');
  const [deepLinkMessage, setDeepLinkMessage] = useState<string | null>(null);
  const deepLinkProcessedRef = useRef(false);

  const getTargetCommentId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const fromPath = window.location.pathname.match(/\/comments\/([^/?#]+)/)?.[1] || null;
    const fromHash = window.location.hash.match(/^#comment-(.+)$/)?.[1] || null;
    const candidates = [
      fromPath,
      params.get('commentId'),
      params.get('comment'),
      params.get('replyId'),
      deepLinkCommentId,
      fromHash,
    ];
    for (const candidate of candidates) {
      const normalized = normalizeCommentTargetId(candidate);
      if (normalized) {
        console.log('[DEEPLINK][Comments] target candidate matched', {
          pathname: window.location.pathname,
          search: window.location.search,
          fromPath,
          fromHash,
          deepLinkCommentId,
          candidate,
          normalized,
        });
        return normalized;
      }
    }
    return null;
  }, [deepLinkCommentId]);

  const scrollToCommentNode = useCallback((targetId: string): boolean => {
    const node = document.getElementById(`comment-${targetId}`);
    if (!node) return false;

    // scrollIntoView is the most reliable cross-browser/mobile approach
    try {
      node.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    } catch {
      node.scrollIntoView(true);
    }
    return true;
  }, []);

  // Fetch comments on mount (and when prediction changes).
  useEffect(() => {
    if (!predictionId) return;
    fetchComments(predictionId).catch((error) => {
      if (error?.status >= 500) {
        toast.error('Failed to load comments. Please try again.');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictionId]);

  // Reset deep-link processed flag when predictionId or target changes
  useEffect(() => {
    deepLinkProcessedRef.current = false;
  }, [predictionId, deepLinkCommentId]);

  // Single unified deep-link effect: waits for initial load, then locates/fetches/scrolls
  useEffect(() => {
    // Only run once per deep-link target
    if (deepLinkProcessedRef.current) return;

    const targetId = getTargetCommentId();
    if (!targetId) return;

    // Wait until the initial comment list has loaded before doing anything
    if (predictionStatus !== 'loaded') return;

    // Mark as processed so we don't re-run on every predictionComments change
    deepLinkProcessedRef.current = true;
    let cancelled = false;

    const findInComments = (): boolean => {
      const currentComments = useUnifiedCommentStore.getState().byPrediction[predictionId]?.items ?? [];
      return currentComments.some((comment) => {
        if (comment.id === targetId) return true;
        return (comment.replies || []).some((reply) => reply.id === targetId);
      });
    };

    const scrollAndHighlight = () => {
      if (cancelled) return;
      setHighlighted(predictionId, targetId);
      let attempts = 0;
      const maxAttempts = 20;
      let scrollCount = 0;
      const tick = () => {
        if (cancelled) return;
        attempts += 1;

        const node = document.getElementById(`comment-${targetId}`);
        const nodeExists = !!node;
        if (!nodeExists) {
          if (attempts < maxAttempts) {
            window.setTimeout(tick, 200);
          } else {
            setDeepLinkStatus('idle');
            setDeepLinkMessage(null);
            unsuppressScrollToTop();
          }
          return;
        }

        // Node exists — scroll to it
        scrollCount += 1;
        scrollToCommentNode(targetId);
        const rect = node.getBoundingClientRect();
        const viewportH = window.innerHeight || document.documentElement.clientHeight;
        const inView = rect.bottom > -200 && rect.top < viewportH + 200;

        if (inView) {
          setDeepLinkStatus('idle');
          setDeepLinkMessage(null);
          unsuppressScrollToTop();
          return;
        }

        if (attempts < maxAttempts) {
          window.setTimeout(tick, 500);
        } else {
          setDeepLinkStatus('idle');
          setDeepLinkMessage(null);
          unsuppressScrollToTop();
        }
      };
      // Initial delay: wait for scroll manager cascade + Framer Motion to settle
      window.setTimeout(tick, 600);
    };

    const run = async () => {
      // Check if the comment is already in the loaded list
      if (findInComments()) {
        console.log('[DEEPLINK][Comments] target found in loaded list', { targetId });
        scrollAndHighlight();
        return;
      }

      // Not in list \u2014 fetch it from the API
      setDeepLinkStatus('locating');
      setDeepLinkMessage('Opening comment\u2026');

      try {
        const currentItems = useUnifiedCommentStore.getState().byPrediction[predictionId]?.items ?? [];
        console.log('[DEEPLINK][Comments] fetching target by id', {
          predictionId,
          targetId,
          loadedTopLevelIds: currentItems.map((c) => c.id),
          loadedReplyIds: currentItems.flatMap((c) => (c.replies || []).map((r) => r.id)),
        });
        const result = await fetchCommentById(predictionId, targetId);
        if (cancelled) return;

        if (result?.ok === false) {
          console.log('[DEEPLINK][Comments] target not found from API', { predictionId, targetId, status: result.status });
          setDeepLinkStatus('missing');
          setDeepLinkMessage('This comment isn\u2019t available.');
          return;
        }

        // fetchCommentById merged the comment into the store \u2014 now scroll to it
        console.log('[DEEPLINK][Comments] target fetched, scrolling', { targetId });
        scrollAndHighlight();
      } catch (err) {
        if (cancelled) return;
        console.error('[DEEPLINK][Comments] fetch error', err);
        setDeepLinkStatus('missing');
        setDeepLinkMessage('This comment isn\u2019t available.');
      }
    };

    void run();
    return () => { cancelled = true; };
  // NOTE: predictionComments is intentionally EXCLUDED from deps.
  // Including it causes the effect to re-run (and cancel its timers) when
  // fetchCommentById merges new data into the store, killing the scroll.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictionStatus, predictionId, getTargetCommentId, setHighlighted, scrollToCommentNode, fetchCommentById]);

  // Handle adding new comments
  const handleAddComment = useCallback(async (text: string) => {
    try {
      await addComment(predictionId, text);
    } catch (error: any) {
      // Don't toast generic "failed" \u2014 the inline failed state handles it.
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
      // Failed again \u2014 store keeps it as failed with updated message
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
    const shouldCloseNow = () => Date.now() - menuOpenedAtRef.current > MIN_OPEN_MS;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleCloseMenu();
    };
    const handleScroll = () => {
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
        {(deepLinkStatus === 'locating' || deepLinkStatus === 'missing') && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {deepLinkStatus === 'locating' && (
                <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
              )}
              <span>{deepLinkMessage}</span>
            </div>
            {deepLinkStatus === 'missing' && (
              <button
                type="button"
                className="text-emerald-600 font-medium hover:text-emerald-700"
                onClick={() => {
                  setDeepLinkStatus('idle');
                  setDeepLinkMessage(null);
                }}
              >
                View latest comments
              </button>
            )}
          </div>
        )}
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
          highlightedId={highlightedId}
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
        message="You won't see their content anymore."
        confirmText="Block"
        cancelText="Cancel"
        variant="danger"
        isLoading={isBlocking}
      />
    </div>
  );
};
