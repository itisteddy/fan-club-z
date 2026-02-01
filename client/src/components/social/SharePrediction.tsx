import React, { useState } from 'react';
import { Share2, Copy, Check, Twitter, MessageCircle, Download, Link } from 'lucide-react';
import { usePredictionStore } from '../../store/predictionStore';
import { notificationHelpers } from '../../store/notificationStore';
import { buildPredictionCanonicalUrl } from '@/lib/predictionUrls';

interface SharePredictionProps {
  predictionId: string;
  predictionTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SharePrediction: React.FC<SharePredictionProps> = ({
  predictionId,
  predictionTitle,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareAnalytics, setShareAnalytics] = useState({
    views: 0,
    clicks: 0,
    signups: 0,
  });

  const shareUrl = buildPredictionCanonicalUrl(predictionId, predictionTitle);
  const shareText = `Check out this prediction: "${predictionTitle}" on Fan Club Z!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notificationHelpers.showSuccessToast('Link copied');
      setTimeout(() => setCopied(false), 2000);
      trackShare('copy_link');
    } catch (error) {
      notificationHelpers.showErrorToast("Couldn't copy link");
      try {
        window.prompt('Copy this link:', shareUrl);
      } catch {}
    }
  };

  const trackShare = (method: string) => {
    // This would integrate with analytics service
    console.log('Share tracked:', { method, predictionId, timestamp: new Date() });
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
    trackShare('twitter');
  };

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    trackShare('whatsapp');
  };

  const shareToTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank');
    trackShare('telegram');
  };

  const shareViaNativeAPI = async () => {
    if ('share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Fan Club Z Prediction',
          text: shareText,
          url: shareUrl,
        });
        trackShare('native_share');
      } catch (error) {
        // User cancelled sharing
      }
    }
  };

  const downloadAsImage = () => {
    // This would generate a shareable image of the prediction
    // For now, we'll show a placeholder
    notificationHelpers.showInfoToast('Image download feature coming soon!');
    trackShare('download_image');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10500] bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="fixed inset-x-0 bottom-0 bg-white rounded-t-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Share Prediction</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">{predictionTitle}</h4>
          <p className="text-sm text-gray-600">fanclubz.com</p>
        </div>

        {/* Share Options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <Check className="w-5 h-5 text-teal-600" />
            ) : (
              <Copy className="w-5 h-5 text-gray-600" />
            )}
            <span className="font-medium text-gray-900">
              {copied ? 'Copied!' : 'Copy Link'}
            </span>
          </button>

          {/* Native Share (Mobile) */}
          {'share' in navigator && typeof navigator.share === 'function' && (
            <button
              onClick={shareViaNativeAPI}
              className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Share</span>
            </button>
          )}

          {/* Twitter */}
          <button
            onClick={shareToTwitter}
            className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Twitter className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900">Twitter</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={shareToWhatsApp}
            className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-teal-600" />
            <span className="font-medium text-gray-900">WhatsApp</span>
          </button>

          {/* Telegram */}
          <button
            onClick={shareToTelegram}
            className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Send className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900">Telegram</span>
          </button>

          {/* Download Image */}
          <button
            onClick={downloadAsImage}
            className="flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <Download className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">Image</span>
          </button>
        </div>

        {/* Share Analytics (if user is creator) */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Share Performance</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{shareAnalytics.views}</div>
              <div className="text-xs text-gray-500">Views</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{shareAnalytics.clicks}</div>
              <div className="text-xs text-gray-500">Clicks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{shareAnalytics.signups}</div>
              <div className="text-xs text-gray-500">Sign-ups</div>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <Link className="w-3 h-3 inline mr-1" />
            Shared links are public and can be viewed by anyone. Personal information is not shared.
          </p>
        </div>
      </div>
    </div>
  );
};

// Send icon component (since it's not in lucide-react by default)
const Send: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);

// Share button component for use in prediction cards
export const ShareButton: React.FC<{
  predictionId: string;
  predictionTitle: string;
  className?: string;
}> = ({ predictionId, predictionTitle, className = '' }) => {
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsShareOpen(true);
        }}
        className={`flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors ${className}`}
      >
        <Share2 className="w-4 h-4" />
        <span className="text-sm">Share</span>
      </button>

      <SharePrediction
        predictionId={predictionId}
        predictionTitle={predictionTitle}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </>
  );
};
