import React, { useState } from 'react';
import { X, Copy, Share2, Twitter, MessageCircle, Send, Link, ExternalLink, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast';
import { createShareContent, shareContent, ShareContent } from '../../utils/shareUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: {
    id: string;
    title: string;
    description?: string;
    category: string;
  };
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  prediction
}) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!isOpen) return null;

  const shareData = createShareContent(prediction, {
    includeDescription: true,
    includeBranding: true
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareData.fullMessage);
      toast.success('Full message copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleNativeShare = async () => {
    setSharing(true);
    try {
      const success = await shareContent(shareData, {
        analyticsCallback: (method, success) => {
          console.log(`Share method: ${method}, success: ${success}`);
        }
      });
      
      if (success) {
        toast.success('Shared successfully!');
        onClose();
      } else {
        toast.error('Failed to share');
      }
    } catch (error) {
      toast.error('Failed to share');
    } finally {
      setSharing(false);
    }
  };

  const handlePlatformShare = (platform: 'twitter' | 'whatsapp' | 'telegram') => {
    const platformData = createShareContent(prediction, {
      includeDescription: true,
      includeBranding: true,
      platform
    });

    let shareUrl = '';
    const encodedText = encodeURIComponent(platformData.text);
    const encodedUrl = encodeURIComponent(platformData.url);

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(platformData.fullMessage)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      sports: '⚽',
      pop_culture: '🎬',
      politics: '🗳️',
      esports: '🎮',
      celebrity_gossip: '⭐',
      custom: '🎯'
    };
    return emojis[category] || '🎯';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      sports: 'bg-green-100 text-green-800',
      pop_culture: 'bg-purple-100 text-purple-800',
      politics: 'bg-blue-100 text-blue-800',
      esports: 'bg-orange-100 text-orange-800',
      celebrity_gossip: 'bg-pink-100 text-pink-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Share Prediction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 border-b border-gray-100">
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getCategoryEmoji(prediction.category)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-2">
                  {prediction.title}
                </h3>
                {prediction.description && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">
                    {prediction.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(prediction.category)}`}>
                    {prediction.category.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">Fan Club Z</span>
                </div>
              </div>
            </div>
          </div>

          {/* Link Display */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Link className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Share Link</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareData.url}
                readOnly
                className="flex-1 text-sm text-gray-600 bg-white rounded px-3 py-2 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCopyLink}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-blue-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Share via</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              onClick={handleNativeShare}
              disabled={sharing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Share2 className="w-4 h-4" />
              {sharing ? 'Sharing...' : 'Native Share'}
            </Button>

            <Button
              onClick={handleCopyFullMessage}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Message
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => handlePlatformShare('twitter')}
              variant="outline"
              className="flex flex-col items-center gap-1 p-3 h-auto"
            >
              <Twitter className="w-5 h-5 text-blue-400" />
              <span className="text-xs">Twitter</span>
            </Button>

            <Button
              onClick={() => handlePlatformShare('whatsapp')}
              variant="outline"
              className="flex flex-col items-center gap-1 p-3 h-auto"
            >
              <MessageCircle className="w-5 h-5 text-green-500" />
              <span className="text-xs">WhatsApp</span>
            </Button>

            <Button
              onClick={() => handlePlatformShare('telegram')}
              variant="outline"
              className="flex flex-col items-center gap-1 p-3 h-auto"
            >
              <Send className="w-5 h-5 text-blue-500" />
              <span className="text-xs">Telegram</span>
            </Button>
          </div>

          {/* Preview of what will be shared */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
            <div className="text-sm text-gray-600 whitespace-pre-line">
              {shareData.fullMessage}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
