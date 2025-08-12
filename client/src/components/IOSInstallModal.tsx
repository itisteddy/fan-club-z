import React, { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col ios-install-modal"
      onClick={onClose}
      style={{ zIndex: 10000 }}
    >
      {/* Safe area top spacing */}
      <div className="flex-1 flex items-center justify-center p-4 pb-24">
        <div 
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[calc(100vh-8rem)]"
          onClick={(e) => e.stopPropagation()}
          style={{ zIndex: 10001 }}
        >
          {/* Fixed Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-center text-white relative rounded-t-2xl flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3">
              <Smartphone className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold mb-1">Install Fan Club Z</h2>
            <p className="text-green-100 text-sm">
              Get the full app experience with offline access and notifications
            </p>
          </div>

          {/* Scrollable content area with proper mobile UX */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2 text-base">
                      Tap the Share button
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Share className="w-4 h-4" />
                      <span>Usually found at the bottom of Safari</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2 text-base">
                      Select "Add to Home Screen"
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Plus className="w-4 h-4" />
                      <span>Scroll down in the share menu to find this option</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2 text-base">
                      Tap "Add" to confirm
                    </p>
                    <p className="text-sm text-gray-600">
                      Fan Club Z will appear on your home screen like a native app
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 text-base">Why install?</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Faster loading and smoother experience</li>
                  <li>• Works offline for viewing your predictions</li>
                  <li>• Push notifications for important updates</li>
                  <li>• Easy access from your home screen</li>
                </ul>
              </div>

              {/* Extra bottom padding for scrolling */}
              <div className="h-4"></div>
            </div>
          </div>

          {/* Fixed bottom actions with safe area */}
          <div className="border-t border-gray-100 p-4 flex-shrink-0 rounded-b-2xl">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors text-base"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  onClose();
                  // Don't show again for a week
                  localStorage.setItem('ios-install-dismissed', Date.now().toString());
                }}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-base"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IOSInstallModal;