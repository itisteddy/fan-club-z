import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, Zap, Bell } from 'lucide-react';
import { pwaManager } from '../utils/pwa';

interface InstallPromptCardProps {
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallPromptCard: React.FC<InstallPromptCardProps> = ({ onInstall, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show with animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleInstall = () => {
    setIsVisible(false);
    setTimeout(onInstall, 300); // Wait for animation
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  };

  return (
    <div className={`
      fixed inset-x-4 top-20 max-w-sm mx-auto transition-all duration-300 ease-out pwa-install-prompt
      ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4'}
    `} style={{ zIndex: 10000 }}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-purple-500 to-teal-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Install Fan Club Z</h3>
                <p className="text-xs text-green-100">Get the full app experience</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-green-100 hover:text-white transition-colors p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-4 space-y-3">
          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-teal-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Faster Performance</p>
              <p className="text-xs text-gray-600">Lightning-fast loading and smooth animations</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Push Notifications</p>
              <p className="text-xs text-gray-600">Get notified about prediction results and updates</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Offline Access</p>
              <p className="text-xs text-gray-600">View your predictions even without internet</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex space-x-2">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 px-4 text-gray-700 bg-gray-100 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 py-2.5 px-4 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Install</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Smart install prompt that appears at optimal times
const SmartInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [userEngagement, setUserEngagement] = useState(0);

  useEffect(() => {
    // Track user engagement
    let engagementScore = 0;
    const engagementEvents = ['click', 'scroll', 'touchstart', 'keydown'];
    
    const trackEngagement = () => {
      engagementScore++;
      setUserEngagement(engagementScore);
      
      // Show prompt after significant engagement
      if (engagementScore >= 5 && !localStorage.getItem('install-prompt-shown')) {
        checkAndShowPrompt();
      }
    };

    engagementEvents.forEach(event => {
      document.addEventListener(event, trackEngagement, { passive: true });
    });

    return () => {
      engagementEvents.forEach(event => {
        document.removeEventListener(event, trackEngagement);
      });
    };
  }, []);

  const checkAndShowPrompt = () => {
    // Don't show if already installed or recently dismissed
    if (pwaManager.isAppInstalled()) return;
    
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    if (!dismissed || Date.now() - dismissedTime > oneDayInMs) {
      // Additional checks for optimal timing
      const timeOnSite = Date.now() - (parseInt(localStorage.getItem('session-start') || '0'));
      const hasCreatedPrediction = localStorage.getItem('has-created-prediction');
      const hasPlacedPrediction = localStorage.getItem('has-placed-prediction');
      
      // Show if user has been engaged for at least 30 seconds and has interacted meaningfully
      if (timeOnSite > 30000 && (hasCreatedPrediction || hasPlacedPrediction)) {
        setShowPrompt(true);
        localStorage.setItem('install-prompt-shown', 'true');
      }
    }
  };

  const handleInstall = async () => {
    const isIOS = pwaManager.isIOSDevice();
    
    if (isIOS) {
      // For iOS, show instructions
      window.dispatchEvent(new CustomEvent('show-ios-install'));
    } else {
      // For Android, use native prompt
      const installed = await pwaManager.promptInstall();
      if (!installed) {
        localStorage.setItem('install-prompt-dismissed', Date.now().toString());
      }
    }
    
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <InstallPromptCard 
      onInstall={handleInstall}
      onDismiss={handleDismiss}
    />
  );
};

export default SmartInstallPrompt;