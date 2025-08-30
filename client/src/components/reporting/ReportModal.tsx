import React, { useState } from 'react';
import { X, Flag, AlertTriangle, Shield, User, MessageCircle, BarChart3 } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import { socialApiService } from '../../services/socialApiService';

export interface ReportData {
  contentType: 'prediction' | 'comment' | 'user';
  contentId: string;
  reason: string;
  description: string;
  evidence?: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'prediction' | 'comment' | 'user';
  contentId: string;
  contentTitle?: string;
  contentAuthor?: string;
}

const REPORT_REASONS = {
  prediction: [
    { value: 'inappropriate_content', label: 'Inappropriate Content', icon: AlertTriangle },
    { value: 'spam', label: 'Spam or Misleading', icon: Shield },
    { value: 'harassment', label: 'Harassment or Bullying', icon: User },
    { value: 'fake_news', label: 'Fake News or Misinformation', icon: AlertTriangle },
    { value: 'illegal_activity', label: 'Illegal Activity', icon: Shield },
    { value: 'other', label: 'Other', icon: Flag }
  ],
  comment: [
    { value: 'inappropriate_content', label: 'Inappropriate Content', icon: AlertTriangle },
    { value: 'spam', label: 'Spam or Misleading', icon: Shield },
    { value: 'harassment', label: 'Harassment or Bullying', icon: User },
    { value: 'hate_speech', label: 'Hate Speech', icon: AlertTriangle },
    { value: 'personal_info', label: 'Personal Information', icon: User },
    { value: 'other', label: 'Other', icon: Flag }
  ],
  user: [
    { value: 'harassment', label: 'Harassment or Bullying', icon: User },
    { value: 'spam', label: 'Spam Account', icon: Shield },
    { value: 'fake_account', label: 'Fake Account', icon: User },
    { value: 'inappropriate_behavior', label: 'Inappropriate Behavior', icon: AlertTriangle },
    { value: 'other', label: 'Other', icon: Flag }
  ]
};

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
  contentAuthor
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = REPORT_REASONS[contentType];

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please select a reason for reporting');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a description of the issue');
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData = {
        contentType,
        contentId,
        reason,
        description: description.trim(),
        evidence: evidence.trim() || undefined
      };

      await socialApiService.submitReport(reportData);
      onClose();
      
      // Reset form
      setReason('');
      setDescription('');
      setEvidence('');
      
    } catch (error) {
      console.error('❌ Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset form
      setReason('');
      setDescription('');
      setEvidence('');
    }
  };

  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'prediction': return 'Prediction';
      case 'comment': return 'Comment';
      case 'user': return 'User';
      default: return 'Content';
    }
  };

  const getContentTypeIcon = () => {
    switch (contentType) {
      case 'prediction': return <BarChart3 className="w-5 h-5" />;
      case 'comment': return <MessageCircle className="w-5 h-5" />;
      case 'user': return <User className="w-5 h-5" />;
      default: return <Flag className="w-5 h-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Report {getContentTypeLabel()}</h2>
              <p className="text-sm text-gray-600">Help us keep the community safe</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Content Info */}
          {(contentTitle || contentAuthor) && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {getContentTypeIcon()}
                <span className="text-sm font-medium text-gray-700">
                  {getContentTypeLabel()} being reported:
                </span>
              </div>
              {contentTitle && (
                <p className="text-sm text-gray-900 font-medium">{contentTitle}</p>
              )}
              {contentAuthor && (
                <p className="text-sm text-gray-600">by {contentAuthor}</p>
              )}
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Reason for reporting *
            </label>
            <div className="space-y-2">
              {reasons.map((reasonOption) => {
                const Icon = reasonOption.icon;
                return (
                  <button
                    key={reasonOption.value}
                    onClick={() => setReason(reasonOption.value)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      reason === reasonOption.value
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${
                        reason === reasonOption.value ? 'text-red-600' : 'text-gray-500'
                      }`} />
                      <span className={`text-sm font-medium ${
                        reason === reasonOption.value ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        {reasonOption.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about why you're reporting this content..."
              className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {description.length}/500
            </div>
          </div>

          {/* Evidence (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Evidence (Optional)
            </label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Any additional context, links, or evidence that might help our review..."
              className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={3}
              maxLength={300}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {evidence.length}/300
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Privacy Notice</p>
                <p className="text-xs text-blue-700">
                  Your report will be reviewed by our moderation team. We take your privacy seriously and will not share your identity with the reported user.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-red-600 hover:bg-red-700"
            disabled={isSubmitting || !reason.trim() || !description.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </div>
  );
};
