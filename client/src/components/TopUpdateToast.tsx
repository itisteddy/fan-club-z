import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Sparkles } from 'lucide-react';

interface TopUpdateToastProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

const TopUpdateToast: React.FC<TopUpdateToastProps> = ({
  isVisible,
  onUpdate,
  onDismiss
}) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimatingOut(false);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(onDismiss, 300);
  };

  const handleUpdate = () => {
    setIsAnimatingOut(true);
    setTimeout(onUpdate, 200);
  };

  if (!isVisible && !isAnimatingOut) return null;

  return (
    <div
      className={`
        fixed inset-x-0 top-4 z-[10001] flex justify-center px-4 pointer-events-none update-notification
        transition-all duration-300 ease-out
        ${isVisible && !isAnimatingOut ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Non-blocking toast notification */}
      <div className={`
        pointer-events-auto w-full max-w-sm max-h-[90vh] overflow-y-auto
      `}>
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header with icon and close */}
          <div className="bg-gradient-to-r from-purple-500 to-teal-600 p-4 text-white relative">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base flex items-center space-x-2">
                  <span>Update Available!</span>
                  <Sparkles className="w-4 h-4" />
                </h3>
                <p className="text-sm text-green-100">
                  New features and improvements ready
                </p>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-green-100 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Dismiss update notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                🚀 <strong>What's New:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-2">
                <li>• Improved performance and stability</li>
                <li>• Enhanced user interface</li>
                <li>• Bug fixes and optimizations</li>
              </ul>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleUpdate}
                className="flex-[2] bg-teal-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center space-x-2 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Update Now</span>
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 py-3 px-4 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium hover:bg-gray-50 rounded-xl border border-gray-200"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopUpdateToast;
