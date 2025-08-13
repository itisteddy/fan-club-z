import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface UpdateNotificationProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
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
    setTimeout(onUpdate, 300);
  };

  if (!isVisible && !isAnimatingOut) return null;

  return (
    <div className={`
      fixed inset-x-4 max-w-md mx-auto transition-all duration-300 ease-out update-notification
      ${isVisible && !isAnimatingOut 
        ? 'top-20 opacity-100 transform translate-y-0' 
        : 'top-16 opacity-0 transform -translate-y-4'
      }
    `}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Compact header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">App Update Ready</h3>
                <p className="text-xs text-blue-100">New features available</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-blue-100 hover:text-white transition-colors p-1 rounded ml-2"
              aria-label="Dismiss update notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact content */}
        <div className="px-4 py-3">
          <p className="text-sm text-gray-600 mb-3">
            Get the latest improvements and bug fixes.
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Update Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;