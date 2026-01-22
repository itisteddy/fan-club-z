import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/utils/environment';
import type { Prediction } from '@/store/predictionStore';
import { supabase } from '@/lib/supabase';

type PredictionCategory = Prediction['category'];

interface EditPredictionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prediction: Prediction & { entriesCount?: number; hasEntries?: boolean };
  onSaved: (updatedPrediction: Prediction) => void;
  userId?: string;
}

export function EditPredictionSheet({
  open,
  onOpenChange,
  prediction,
  onSaved,
  userId,
}: EditPredictionSheetProps) {
  const [title, setTitle] = useState(prediction.title || '');
  const [description, setDescription] = useState(prediction.description || '');
  const [options, setOptions] = useState<Array<{ id?: string; label: string }>>(
    (prediction.options || []).map((opt) => ({ id: opt.id, label: opt.label }))
  );
  const [closesAt, setClosesAt] = useState(
    prediction.entry_deadline
      ? new Date(prediction.entry_deadline).toISOString().slice(0, 16)
      : ''
  );
  const [category, setCategory] = useState(prediction.category || 'custom');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasEntries = prediction.hasEntries ?? (prediction.entriesCount ?? 0) > 0;
  const oldDeadline = prediction.entry_deadline ? new Date(prediction.entry_deadline) : null;

  // Reset form when prediction changes
  useEffect(() => {
    if (prediction) {
      setTitle(prediction.title || '');
      setDescription(prediction.description || '');
      setOptions((prediction.options || []).map((opt) => ({ id: opt.id, label: opt.label })));
      setClosesAt(
        prediction.entry_deadline
          ? new Date(prediction.entry_deadline).toISOString().slice(0, 16)
          : ''
      );
      setCategory(prediction.category || 'custom');
      setErrors({});
    }
  }, [prediction, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!hasEntries) {
      if (!title.trim()) {
        newErrors.title = 'Title is required';
      }

      if (options.length < 2) {
        newErrors.options = 'Must have at least 2 options';
      } else {
        // Check for duplicate labels (case-insensitive)
        const labels = options.map((o) => o.label.toLowerCase().trim()).filter(Boolean);
        const uniqueLabels = new Set(labels);
        if (labels.length !== uniqueLabels.size) {
          newErrors.options = 'Option labels must be unique';
        }
      }
    }

    if (closesAt) {
      const newDeadline = new Date(closesAt);
      if (isNaN(newDeadline.getTime())) {
        newErrors.closesAt = 'Invalid date';
      } else if (hasEntries && oldDeadline && newDeadline.getTime() <= oldDeadline.getTime()) {
        newErrors.closesAt = 'Can only extend close time forward when entries exist';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddOption = () => {
    if (hasEntries) return;
    setOptions([...options, { label: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    if (hasEntries || options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, label: string) => {
    if (hasEntries) return;
    const updated = [...options];
    updated[index] = { ...updated[index], label };
    setOptions(updated);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      // Use userId from props or try to get from auth
      const effectiveUserId = userId || 
                              (window as any).__FCZ_USER_ID || 
                              localStorage.getItem('userId') ||
                              (window as any).__FCZ_CURRENT_USER?.id;
      if (!effectiveUserId) {
        toast.error('Please sign in to edit predictions');
        setIsSaving(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: null } as any));
      const accessToken = sessionData?.session?.access_token || null;

      const payload: any = {};
      if (!hasEntries && title !== prediction.title) {
        payload.title = title.trim();
      }
      if (description !== (prediction.description || '')) {
        payload.description = description.trim() || null;
      }
      if (closesAt) {
        payload.closesAt = new Date(closesAt).toISOString();
      }
      if (!hasEntries && category !== prediction.category) {
        payload.categoryId = category;
      }
      if (!hasEntries && options.length > 0) {
        // Only send options if they changed
        const optionsChanged =
          options.length !== (prediction.options || []).length ||
          options.some((opt, idx) => {
            const oldOpt = prediction.options?.[idx];
            return !oldOpt || opt.label !== oldOpt.label;
          });
        if (optionsChanged) {
          payload.options = options.filter((opt) => opt.label.trim());
        }
      }

      if (Object.keys(payload).length === 0) {
        toast.success('No changes to save');
        setIsSaving(false);
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${prediction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          userId: effectiveUserId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Failed to update prediction');
      }

      const result = await response.json();
      toast.success('Prediction updated successfully');
      onSaved(result.data);
      onOpenChange(false);
    } catch (error: any) {
      console.error('[EditPredictionSheet] Save failed:', error);
      toast.error(error.message || 'Failed to update prediction');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Must be above bottom nav (z-[9999]) */}
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[12000]" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[12001] max-h-[calc(100vh-5rem-env(safe-area-inset-bottom))] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
            <Dialog.Title className="text-lg font-semibold text-gray-900">Edit prediction</Dialog.Title>
            <Dialog.Close className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </Dialog.Close>
          </div>

          {/* Content with extra bottom padding so CTA is never clipped by navigation bar */}
          <div className="px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] space-y-6">
            {/* Editing limits notice */}
            {hasEntries && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Editing limits</p>
                  <p className="text-xs text-amber-700 mt-1">
                    This prediction already has participants. You can only extend the close time.
                  </p>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title {!hasEntries && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={hasEntries}
                className={`w-full px-3 py-2 border rounded-lg ${
                  hasEntries
                    ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                    : errors.title
                    ? 'border-red-300'
                    : 'border-gray-300'
                }`}
                placeholder="Enter prediction title"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              {hasEntries && (
                <p className="text-xs text-gray-500 mt-1">Cannot change title after participants have staked</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                placeholder="Optional description"
              />
            </div>

            {/* Options (only when no entries) */}
            {!hasEntries && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder={`Option ${index + 1}`}
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add option
                  </button>
                </div>
                {errors.options && <p className="text-xs text-red-500 mt-1">{errors.options}</p>}
              </div>
            )}

            {/* Close time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Close time {!hasEntries && <span className="text-red-500">*</span>}
              </label>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                min={oldDeadline ? oldDeadline.toISOString().slice(0, 16) : undefined}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.closesAt ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.closesAt && <p className="text-xs text-red-500 mt-1">{errors.closesAt}</p>}
              {hasEntries && oldDeadline && (
                <p className="text-xs text-gray-500 mt-1">
                  Current: {oldDeadline.toLocaleString()}. Can only extend forward.
                </p>
              )}
            </div>

            {/* Category (only when no entries) */}
            {!hasEntries && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PredictionCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="sports">Sports</option>
                  <option value="pop_culture">Pop Culture</option>
                  <option value="custom">Custom</option>
                  <option value="esports">Esports</option>
                  <option value="celebrity_gossip">Celebrity Gossip</option>
                  <option value="politics">Politics</option>
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
