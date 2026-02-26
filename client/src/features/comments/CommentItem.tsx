import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Heart, Clock, AlertCircle, RefreshCw, X, Loader2, MoreVertical, Edit3, Trash2, Flag, Reply, Link2, UserX, BadgeCheck } from 'lucide-react';
import { Comment } from '../../store/unifiedCommentStore';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '../../lib/api';
import { buildPredictionCommentUrl } from '@/lib/predictionUrls';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { ConfirmationModal } from '../../components/modals/ConfirmationModal';

interface CommentItemProps {
  comment: Comment;
  onToggleLike?: (commentId: string) => void;
  onRetry?: (clientTempId: string) => void;
  onDismiss?: (clientTempId: string) => void;
  onEdit?: (commentId: string, text: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onReply?: (parentCommentId: string, text: string) => Promise<void> | void;
  onReport?: (commentId: string) => void;
  onBlockUser?: (userId: string) => void;
  isReply?: boolean;
  predictionTitle?: string;
  openMenuCommentId?: string | null;
  onOpenMenu?: (commentId: string) => void;
  onCloseMenu?: () => void;
  highlighted?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onToggleLike,
  onRetry,
  onDismiss,
  onEdit,
  onDelete,
  onReply,
  onReport,
  onBlockUser,
  isReply = false,
  predictionTitle,
  openMenuCommentId,
  onOpenMenu,
  onCloseMenu,
  highlighted = false,
}) => {
  const navigate = useNavigate();
  const likeCount = comment.likes_count || comment.likeCount || 0;
  const isLiked = comment.is_liked || comment.likedByMe || false;
  const createdAt = comment.created_at || comment.createdAt;
  const content = comment.content || comment.text;
  const displayName = comment.user?.full_name || comment.user?.username || 'Anonymous';
  const username = comment.user?.username || '';
  const handle = username && username !== 'Anonymous' ? `@${username}` : null;
  const avatarUrl = comment.user?.avatar_url || comment.user?.avatarUrl;

  const isSending = comment.sendStatus === 'sending';
  const isFailed = comment.sendStatus === 'failed';
  const isOptimistic = isSending || isFailed;
  const isDeleted = comment.isDeleted || !!comment.deleted_at;

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content || comment.text || '');
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkedBadge, setShowLinkedBadge] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isMenuOpen = openMenuCommentId === comment.id;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUsername = useAuthStore((s) => s.user?.username);
  const currentFullName = useAuthStore((s) => s.user?.full_name);
  const { user: sessionUser } = useAuthSession();
  const effectiveUserId = sessionUser?.id || currentUserId;
  const effectiveUsername =
    (sessionUser?.user_metadata as any)?.username ||
    (sessionUser?.user_metadata as any)?.user_name ||
    currentUsername;
  const effectiveFullName =
    (sessionUser?.user_metadata as any)?.full_name ||
    currentFullName;
  const commentUserId =
    comment.user?.id ||
    (comment as any).user_id ||
    (comment as any).userId ||
    (comment as any).authorId;
  const commentUserAuthId =
    (comment.user as any)?.auth_user_id ||
    (comment.user as any)?.authUserId ||
    (comment as any).auth_user_id ||
    (comment as any).authorAuthId;
  const commentUsername = comment.user?.username;
  const commentFullName = comment.user?.full_name;
  const openAuthorProfile = () => {
    const profileHandle = String(comment.user?.username || '').trim();
    if (profileHandle) {
      navigate(`/u/${encodeURIComponent(profileHandle)}`);
      return;
    }
    if (commentUserId) {
      navigate(`/profile/${encodeURIComponent(String(commentUserId))}`);
    }
  };
  const canOpenAuthorProfile = Boolean(String(comment.user?.username || '').trim() || commentUserId);
  const ownerByIdentity = Boolean(
    (effectiveUserId && commentUserId && effectiveUserId === commentUserId) ||
    (effectiveUserId && commentUserAuthId && effectiveUserId === commentUserAuthId) ||
    (effectiveUsername && commentUsername && effectiveUsername.toLowerCase() === commentUsername.toLowerCase()) ||
    (effectiveFullName && commentFullName && effectiveFullName.toLowerCase() === commentFullName.toLowerCase())
  );
  // Treat backend `is_own=true` as authoritative, but never let `false` override
  // explicit identity match in case viewer-auth lookup fails on list fetch.
  const isOwner = comment.is_own === true || ownerByIdentity;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    if (isMobile) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      onCloseMenu?.();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, isMobile, onCloseMenu]);

  useEffect(() => {
    if (!isMenuOpen || !isMobile) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen, isMobile]);

  useLayoutEffect(() => {
    if (!isMenuOpen || isMobile) return;
    const button = menuButtonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const padding = 8;
    const gap = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const spaceBelow = viewportH - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const openUp = spaceBelow < menuRect.height + gap && spaceAbove > spaceBelow;
    const top = openUp
      ? Math.max(padding, buttonRect.top - menuRect.height - gap)
      : Math.min(viewportH - menuRect.height - padding, buttonRect.bottom + gap);

    let left = buttonRect.right - menuRect.width;
    if (left < padding) left = buttonRect.left;
    if (left + menuRect.width > viewportW - padding) {
      left = viewportW - menuRect.width - padding;
    }

    setMenuStyle({
      position: 'fixed',
      top: Math.round(top),
      left: Math.round(left),
      transformOrigin: openUp ? 'bottom right' : 'top right',
      zIndex: 50,
    });
  }, [isMenuOpen, isMobile]);

  useEffect(() => {
    if (!isMenuOpen) setMenuStyle(null);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!highlighted) return;
    setShowLinkedBadge(true);
    const timer = setTimeout(() => setShowLinkedBadge(false), 2000);
    return () => clearTimeout(timer);
  }, [highlighted]);

  useEffect(() => {
    setEditText(comment.content || comment.text || '');
  }, [comment.content, comment.text]);

  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 2) return;
    clearTimeout(mentionTimerRef.current);
    mentionTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/social/users/search?q=${encodeURIComponent(mentionQuery)}&limit=6`);
        if (res?.data && Array.isArray(res.data)) {
          setMentionResults(res.data);
        } else if (Array.isArray(res)) {
          setMentionResults(res);
        } else {
          setMentionResults([]);
        }
      } catch {
        setMentionResults([]);
      }
    }, 200);
  }, [mentionQuery]);

  const handleSelectMention = (username: string, kind: 'edit' | 'reply') => {
    if (kind === 'edit') {
      const next = editText.replace(/@([a-zA-Z0-9_]{2,32})$/, `@${username} `);
      setEditText(next);
    } else {
      const next = replyText.replace(/@([a-zA-Z0-9_]{2,32})$/, `@${username} `);
      setReplyText(next);
    }
    setMentionQuery('');
    setMentionResults([]);
  };

  const handleEditSave = async () => {
    if (!editText.trim()) return;
    if (!onEdit) return;
    setIsSaving(true);
    try {
      await onEdit(comment.id, editText.trim());
      setIsEditing(false);
      onCloseMenu?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
      onCloseMenu?.();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    try {
      await onReply?.(comment.id, replyText.trim());
      setReplyText('');
      setIsReplying(false);
    } catch {
      // Error handled upstream
    }
  };

  const handleCopyLink = async () => {
    const url = buildPredictionCommentUrl(comment.predictionId, comment.id, predictionTitle);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      try {
        const area = document.createElement('textarea');
        area.value = url;
        area.setAttribute('readonly', 'true');
        area.style.position = 'absolute';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        toast.success('Link copied');
      } catch {
        toast.error('Unable to copy link on this device.');
      }
    }
    if (navigator.vibrate) navigator.vibrate(10);
    onCloseMenu?.();
  };

  const handleMenuToggle = () => {
    if (isMenuOpen) {
      onCloseMenu?.();
    } else {
      onOpenMenu?.(comment.id);
    }
  };

  const actions = [
    ...(isOwner && onEdit && !isDeleted ? [{
      key: 'edit',
      label: 'Edit',
      icon: Edit3,
      onSelect: () => { setIsEditing(true); onCloseMenu?.(); },
      destructive: false,
    }] : []),
    ...(isOwner && onDelete && !isDeleted ? [{
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      onSelect: () => setShowDeleteConfirm(true),
      destructive: true,
    }] : []),
    ...(!isOwner && onReport ? [{
      key: 'report',
      label: 'Report',
      icon: Flag,
      onSelect: () => { onReport(comment.id); onCloseMenu?.(); },
      destructive: false,
    }] : []),
    ...(!isOwner && onBlockUser && comment.user?.id ? [{
      key: 'block',
      label: 'Block user',
      icon: UserX,
      onSelect: () => { onBlockUser(comment.user!.id); onCloseMenu?.(); },
      destructive: true,
    }] : []),
    {
      key: 'copy',
      label: 'Copy link',
      icon: Link2,
      onSelect: handleCopyLink,
      destructive: false,
    },
  ];

  const invokeAction = (action: { onSelect: () => void }, event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    action.onSelect();
  };

  return (
    <div
      id={`comment-${comment.id}`}
      className={`border-b border-gray-100 pb-4 last:border-b-0 ${isFailed ? 'opacity-80' : ''} ${isSending ? 'opacity-60' : ''} ${highlighted ? 'comment-highlight' : ''}`}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] gap-x-3">
        {/* Avatar */}
        <div className="row-span-4 flex-shrink-0">
          {canOpenAuthorProfile ? (
            <button
              type="button"
              onClick={openAuthorProfile}
              className="rounded-full p-0 border-0 bg-transparent appearance-none leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label={`Open profile for ${displayName}`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </button>
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Row 1: Name + verified */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {canOpenAuthorProfile ? (
              <button
                type="button"
                onClick={openAuthorProfile}
                className="font-medium text-sm text-gray-900 leading-tight truncate hover:text-emerald-700 text-left p-0 border-0 bg-transparent appearance-none"
              >
                {displayName}
              </button>
            ) : (
              <span className="font-medium text-sm text-gray-900 leading-tight truncate">
                {displayName}
              </span>
            )}
            {comment.user?.is_verified && (
              <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" aria-label="Verified" />
            )}
          </div>
        </div>

        {/* Row 1: Kebab */}
        {!isOptimistic && actions.length > 0 && (
          <div className="flex items-start justify-end">
            <button
              ref={menuButtonRef}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMenuToggle}
              className="p-1.5 rounded-md hover:bg-gray-100"
              aria-label="Comment actions"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Row 2: Meta line */}
        <div className="col-start-2 col-span-2 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          {handle && (
            canOpenAuthorProfile ? (
              <button
                type="button"
                onClick={openAuthorProfile}
                className="truncate hover:text-gray-700 text-left p-0 border-0 bg-transparent appearance-none"
              >
                {handle}
              </button>
            ) : (
              <span className="truncate">{handle}</span>
            )
          )}
          {!isOptimistic && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          )}
          {!isOptimistic && comment.edited && (
            <span className="text-gray-400">edited</span>
          )}
          {showLinkedBadge && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Linked comment</span>
          )}
          {isSaving && <span className="text-gray-400">saving…</span>}
          {isDeleting && <span className="text-gray-400">deleting…</span>}
          {isSending && (
            <span className="flex items-center gap-1 text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Sending…
            </span>
          )}
        </div>

        {/* Comment text */}
        <div className="col-start-2 col-span-2 mt-2 text-sm text-gray-900 leading-relaxed">
          {isDeleted ? <span className="text-gray-400">Comment deleted</span> : content}
        </div>

        {/* Edit UI */}
        {isEditing && !isDeleted && (
          <div className="col-start-2 col-span-2 mt-2 space-y-2">
            <textarea
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                const match = e.target.value.match(/@([a-zA-Z0-9_]{2,32})$/);
                if (match && match[1]) setMentionQuery(match[1]);
                else { setMentionQuery(''); setMentionResults([]); }
              }}
              rows={3}
              className="w-full border rounded-lg p-2 text-sm"
            />
            {mentionResults.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto">
                {mentionResults.map((u) => (
                  <button
                    key={u.id || u.username}
                    type="button"
                    onClick={() => handleSelectMention(u.username, 'edit')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="text-sm">{u.full_name || u.username}</span>
                    {u.username && <span className="text-xs text-gray-500">@{u.username}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEditSave}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md"
                disabled={!editText.trim()}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setIsEditing(false); setEditText(comment.content || comment.text || ''); }}
                className="px-3 py-1.5 text-sm text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Failed state: inline retry/dismiss */}
        {isFailed && comment.clientTempId && (
          <div className="col-start-2 col-span-2 mt-1 flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{comment.errorMessage || 'Failed to post.'}</span>
            </div>
            {onRetry && (
              <button
                onClick={() => onRetry(comment.clientTempId!)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(comment.text || comment.content || '');
                } catch {
                  window.prompt('Copy comment text:', comment.text || comment.content || '');
                }
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Link2 className="w-3 h-3" /> Copy text
            </button>
            {onDismiss && (
              <button
                onClick={() => onDismiss(comment.clientTempId!)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-3 h-3" /> Dismiss
              </button>
            )}
          </div>
        )}

        {/* Actions (only for confirmed comments) */}
        {!isOptimistic && !isDeleted && (
          <div className="col-start-2 col-span-2 mt-2 flex items-center gap-4">
            <button
              onClick={() => onToggleLike?.(comment.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isLiked
                  ? 'text-red-600 hover:text-red-700'
                  : 'text-gray-500 hover:text-red-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            {!isReply && !isDeleted && onReply && (
              <button
                type="button"
                onClick={() => setIsReplying((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <Reply className="w-4 h-4" /> Reply
              </button>
            )}
          </div>
        )}

        {isReplying && !isDeleted && onReply && (
          <div className="col-start-2 col-span-2 mt-2 space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                const match = e.target.value.match(/@([a-zA-Z0-9_]{2,32})$/);
                if (match && match[1]) setMentionQuery(match[1]);
                else { setMentionQuery(''); setMentionResults([]); }
              }}
              rows={2}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="Write a reply..."
            />
            {mentionResults.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto">
                {mentionResults.map((u) => (
                  <button
                    key={u.id || u.username}
                    type="button"
                    onClick={() => handleSelectMention(u.username, 'reply')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="text-sm">{u.full_name || u.username}</span>
                    {u.username && <span className="text-xs text-gray-500">@{u.username}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReplySubmit}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md"
                disabled={!replyText.trim()}
              >
                Reply
              </button>
              <button
                type="button"
                onClick={() => { setIsReplying(false); setReplyText(''); }}
                className="px-3 py-1.5 text-sm text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {isMenuOpen && !isMobile && (
        <div
          ref={menuRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={menuStyle ?? undefined}
          className="min-w-[180px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
          role="menu"
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isDestructive = action.destructive;
            return (
              <button
                key={action.key}
                type="button"
                onClick={(e) => invokeAction(action, e)}
                className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 ${
                  isDestructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                } ${index === actions.length - 1 ? '' : 'border-b border-gray-100'}`}
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {isMenuOpen && isMobile && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 z-40 bg-black/40"
            onClick={() => onCloseMenu?.()}
          />
          <div
            ref={menuRef}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-2xl"
            style={{
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px) + var(--app-bottom-nav-offset, 0px))',
              maxHeight: 'min(80vh, 520px)',
            }}
          >
            <div className="flex justify-center py-2">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="px-4 pb-2 overflow-y-auto">
              {actions.map((action) => {
                const Icon = action.icon;
                const isDestructive = action.destructive;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={(e) => invokeAction(action, e)}
                    className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-3 text-left text-sm rounded-xl ${
                      isDestructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {action.label}
                  </button>
                );
              })}
              <div className="mt-2 border-t border-gray-100 pt-2">
                <button
                  type="button"
                  onClick={() => onCloseMenu?.()}
                  className="w-full min-h-[44px] flex items-center justify-center px-3 py-3 text-sm text-gray-600 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirmed}
        title="Delete comment?"
        message="This can’t be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
