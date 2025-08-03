import React, { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl w-full max-w-md mx-4 mb-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <Smartphone className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Install Fan Club Z</h2>
          <p className="text-green-100 text-sm">
            Get the full app experience with offline access and notifications
          </p>
        </div>

        {/* Instructions */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 mb-1">
                  Tap the Share button
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Share className="w-4 h-4" />
                  <span>Usually found at the bottom of Safari</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">2</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 mb-1">
                  Select "Add to Home Screen"
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Plus className="w-4 h-4" />
                  <span>Scroll down in the share menu to find this option</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">3</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 mb-1">
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
            <h3 className="font-medium text-gray-900 mb-2">Why install?</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Faster loading and smoother experience</li>
              <li>• Works offline for viewing your predictions</li>
              <li>• Push notifications for important updates</li>
              <li>• Easy access from your home screen</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                onClose();
                // Don't show again for a week
                localStorage.setItem('ios-install-dismissed', Date.now().toString());
              }}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Got It!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IOSInstallModal;