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
    <>
      {/* Backdrop overlay for important notifications */}
      <div className={`
        fixed inset-0 bg-black/10 backdrop-blur-sm z-40 transition-opacity duration-300
        ${isVisible && !isAnimatingOut ? 'opacity-100' : 'opacity-0'}
      `} />
      
      {/* Toast notification - Properly centered with responsive width */}
      <div className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
        w-[calc(100vw-32px)] max-w-sm max-h-[90vh] overflow-y-auto
        transition-all duration-300 ease-out
        ${isVisible && !isAnimatingOut 
          ? 'opacity-100 scale-100' 
          : 'opacity-0 scale-95'
        }
      `}>
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header with icon and close */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white relative">
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
                className="flex-[2] bg-green-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center space-x-2 shadow-lg"
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
    </>
  );
};

export default TopUpdateToast;