/**
 * Report content modal (UGC moderation)
 * Feature flag: VITE_FCZ_UGC_MODERATION
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { submitContentReport, type ReportTargetType } from '@/lib/reportContent';

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;
const REPORT_CATEGORIES = [
  'Spam',
  'Harassment',
  'Hate or abuse',
  'Nudity or sexual content',
  'Misinformation',
  'Other',
];

export interface ReportContentModalProps {
  open: boolean;
  targetType: ReportTargetType;
  targetId: string;
  label: string; // e.g. "this comment", "this prediction"
  accessToken: string | undefined;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReportContentModal({
  open,
  targetType,
  targetId,
  label,
  accessToken,
  onClose,
  onSuccess,
}: ReportContentModalProps) {
  const [reason, setReason] = useState('');
  const [reasonCategory, setReasonCategory] = useState(REPORT_CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !reason.trim() || reason.trim().length < MIN_REASON_LENGTH) {
      setError(`Please provide a reason (at least ${MIN_REASON_LENGTH} characters).`);
      return;
    }
    if (reason.length > MAX_REASON_LENGTH) {
      setError(`Reason must be under ${MAX_REASON_LENGTH} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await submitContentReport(targetType, targetId, reason.trim(), reasonCategory, accessToken);
      if (result.ok) {
        setReason('');
        setReasonCategory(REPORT_CATEGORIES[0]);
        onSuccess?.();
        onClose();
      } else {
        setError(result.message || 'Failed to submit report.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason('');
      setReasonCategory(REPORT_CATEGORIES[0]);
      setError(null);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Report {label}</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="p-1.5 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Your report will be reviewed by our team. Please describe the issue.
          </p>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Category</label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={submitting}
            >
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Spam, harassment, misleading..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
              maxLength={MAX_REASON_LENGTH}
              disabled={submitting}
            />
            <p className="text-xs text-gray-400 mt-1">
              {reason.length}/{MAX_REASON_LENGTH}
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || reason.trim().length < MIN_REASON_LENGTH}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
