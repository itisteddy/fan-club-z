import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { useAuthStore } from '../../store/authStore';
import { useUnifiedCommentStore } from '../../store/unifiedCommentStore';
import { openAuthGate } from '../../auth/authGateAdapter';
import { apiClient } from '../../lib/api';

interface CommentInputProps {
  predictionId: string;
  onSubmit: (text: string) => Promise<void>;
  isPosting: boolean;
  placeholder?: string;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  predictionId,
  onSubmit,
  isPosting,
  placeholder = 'Share your thoughts...',
}) => {
  const { user: sessionUser } = useAuthSession();
  const { user: storeUser } = useAuthStore();
  // sessionUser is Supabase User, storeUser is app User — treat as a loose union here.
  const user: any = storeUser || sessionUser;
  const { getDraft, setDraft, clearDraft } = useUnifiedCommentStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load draft from store on mount
  useEffect(() => {
    const stored = getDraft(predictionId);
    if (stored) setLocalText(stored);
    // Also try session storage if store draft is empty
    if (!stored) {
      try {
        const saved = sessionStorage.getItem(`fcz_comment_draft_${predictionId}`);
        if (saved) setLocalText(saved);
      } catch {}
    }
  }, [predictionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save draft to store (debounced)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);

    // Debounced draft save
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => setDraft(predictionId, val), 300);

    // Mention detection (simple: last token @query)
    const match = val.slice(0, e.target.selectionStart).match(/@([a-zA-Z0-9_]{2,32})$/);
    if (match && match[1]) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery('');
      setMentionResults([]);
    }
  }, [predictionId, setDraft]);

  // Fetch mention suggestions (debounced)
  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 2) return;
    clearTimeout(mentionTimerRef.current);
    mentionTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/social/users/search?q=${encodeURIComponent(mentionQuery)}&limit=8`);
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

  const handleSelectMention = (username: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const caret = ta.selectionStart;
    const before = localText.slice(0, caret).replace(/@([a-zA-Z0-9_]{2,32})$/, `@${username} `);
    const after = localText.slice(caret);
    const next = `${before}${after}`;
    setLocalText(next);
    setMentionQuery('');
    setMentionResults([]);
    // Restore cursor near end of inserted mention
    requestAnimationFrame(() => {
      const pos = before.length;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = localText.trim();
    if (!trimmed || isPosting) return;

    if (!user) {
      openAuthGate({ intent: 'comment_prediction', payload: { predictionId } });
      return;
    }

    try {
      await onSubmit(trimmed);
      // On success: clear local text + draft
      setLocalText('');
      clearDraft(predictionId);
    } catch {
      // Error handling done by store (marks comment as failed inline).
      // Keep text in the input so user can edit + retry.
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!user) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <button
          onClick={() => openAuthGate({ intent: 'comment_prediction', payload: { predictionId } })}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Sign in to comment
        </button>
      </div>
    );
  }

  const charCount = localText.length;
  const isOverLimit = charCount > 1000;

  // Compute display name with robust fallback chain
  const computeDisplayName = (): string => {
    // Priority 1: full_name from users table (most authoritative)
    if (user?.full_name && typeof user.full_name === 'string' && user.full_name.trim()) {
      return user.full_name.trim();
    }
    // Priority 2: Combine firstName + lastName
    const firstName = user?.firstName || user?.first_name || '';
    const lastName = user?.lastName || user?.last_name || '';
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) return combined;
    // Priority 3: Auth metadata
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    // Priority 4: Username
    if (user?.username) return user.username;
    if (user?.user_metadata?.username) return user.user_metadata.username;
    // Priority 5: Email
    if (user?.email) return user.email.split('@')[0];
    return 'Anonymous';
  };
  const displayName = computeDisplayName();

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isPosting}
          rows={3}
          className="w-full h-[120px] p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          maxLength={1000}
          style={{ minHeight: '120px', maxHeight: '120px' }}
          aria-label="Write a comment"
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {charCount}/1000
        </div>
        {mentionResults.length > 0 && (
          <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
            {mentionResults.map((u) => (
              <button
                key={u.id || u.username}
                type="button"
                onClick={() => handleSelectMention(u.username)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xs">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.username} className="w-6 h-6 object-cover" />
                  ) : (
                    <span>{String(u.username || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="text-sm text-gray-900">
                  {u.full_name || u.username}
                  {u.username && <span className="text-xs text-gray-500 ml-2">@{u.username}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Commenting as {displayName}
        </div>
        <button
          type="submit"
          disabled={!localText.trim() || isOverLimit || isPosting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPosting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Posting…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Post
            </>
          )}
        </button>
      </div>
    </form>
  );
};
