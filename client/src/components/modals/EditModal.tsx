import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: {
    id: string | number;
    title: string;
    description?: string;
  };
  onUpdate: (updates: { title?: string; description?: string }) => Promise<void>;
}

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  prediction,
  onUpdate
}) => {
  const [title, setTitle] = useState(prediction.title || '');
  const [description, setDescription] = useState(prediction.description || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Reset form when modal opens/closes or prediction changes
  useEffect(() => {
    if (isOpen) {
      setTitle(prediction.title || '');
      setDescription(prediction.description || '');
      setErrors({});
      // Focus title input after modal animation
      setTimeout(() => titleRef.current?.focus(), 150);
    }
  }, [isOpen, prediction.title, prediction.description]);

  // Auto-resize description textarea
  useEffect(() => {
    const textarea = descriptionRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [description]);

  const validateForm = () => {
    const newErrors: { title?: string; description?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (description.trim().length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    // Check if anything actually changed
    if (trimmedTitle === prediction.title && trimmedDescription === (prediction.description || '')) {
      toast.error('No changes detected');
      return;
    }

    setIsUpdating(true);
    
    try {
      const updates: { title?: string; description?: string } = {};
      
      if (trimmedTitle !== prediction.title) {
        updates.title = trimmedTitle;
      }
      
      if (trimmedDescription !== (prediction.description || '')) {
        updates.description = trimmedDescription;
      }

      await onUpdate(updates);
      toast.success('Prediction updated successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to update prediction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update prediction');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isUpdating) {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isUpdating) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={!isUpdating ? onClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Prediction</h2>
                <p className="text-sm text-gray-500">Update your prediction details</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Prediction Title *
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                  errors.title
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                }`}
                placeholder="Enter prediction title..."
                disabled={isUpdating}
                maxLength={200}
              />
              {errors.title && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.title}
                </div>
              )}
              <p className="text-xs text-gray-500">{title.length}/200 characters</p>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none resize-none ${
                  errors.description
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                }`}
                placeholder="Add more details about your prediction..."
                disabled={isUpdating}
                rows={3}
                maxLength={1000}
                style={{ minHeight: '80px', maxHeight: '120px' }}
              />
              {errors.description && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </div>
              )}
              <p className="text-xs text-gray-500">{description.length}/1000 characters</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="px-6 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            
            <motion.button
              onClick={handleSave}
              disabled={isUpdating || !title.trim() || !!errors.title || !!errors.description}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              whileHover={{ scale: isUpdating ? 1 : 1.02 }}
              whileTap={{ scale: isUpdating ? 1 : 0.98 }}
            >
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </div>
              ) : (
                'Update Prediction'
              )}
            </motion.button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="px-6 pb-4">
            <p className="text-xs text-gray-400 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to cancel or{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">⌘ Enter</kbd> to save
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditModal;
