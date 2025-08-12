import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { pwaManager } from '../utils/pwa';

const PWAInstallBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check initial install status
    const checkInstallStatus = () => {
      if (pwaManager.isAppInstalled()) {
        setShowBanner(false);
        return;
      }

      const isIOS = pwaManager.isIOSDevice();
      const dismissed = localStorage.getItem(isIOS ? 'ios-install-dismissed' : 'pwa-banner-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const daysSinceDissmissal = (Date.now() - dismissedTime) / (24 * 60 * 60 * 1000);
      
      // Show banner if not dismissed recently (1 day for Android, 3 days for iOS)
      const daysThreshold = isIOS ? 3 : 1;
      const shouldShow = !dismissed || daysSinceDissmissal > daysThreshold;
      
      // For MVP, show banner only once per session and make it easily dismissible
      const sessionDismissed = sessionStorage.getItem('pwa-banner-session-dismissed');
      
      if (shouldShow && !sessionDismissed) {
        if (isIOS) {
          // For iOS, show after a delay
          setTimeout(() => setShowBanner(true), 5000); // Increased delay
        } else {
          // For Android, wait for install prompt
          setCanInstall(pwaManager.canInstall());
        }
      }
    };

    // Listen for PWA events
    const handleInstallable = () => {
      setCanInstall(true);
      if (!localStorage.getItem('pwa-banner-dismissed')) {
        setShowBanner(true);
      }
    };

    const handleInstalled = () => {
      setShowBanner(false);
      setCanInstall(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    checkInstallStatus();

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const isIOS = pwaManager.isIOSDevice();
    
    if (isIOS) {
      // For iOS, show instruction modal
      window.dispatchEvent(new CustomEvent('show-ios-install'));
      setShowBanner(false);
    } else {
      // For Android, use native install prompt
      const installed = await pwaManager.promptInstall();
      if (!installed) {
        // User dismissed, remember their choice
        localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
      }
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    const storageKey = pwaManager.isIOSDevice() ? 'ios-install-dismissed' : 'pwa-banner-dismissed';
    localStorage.setItem(storageKey, Date.now().toString());
    // Also dismiss for this session
    sessionStorage.setItem('pwa-banner-session-dismissed', 'true');
  };

  if (!showBanner) {
    return null;
  }

  const isIOS = pwaManager.isIOSDevice();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {isIOS ? 'Add to Home Screen' : 'Install Fan Club Z'}
            </p>
            <p className="text-xs text-green-100">
              {isIOS 
                ? 'Get quick access and offline features'
                : 'Faster loading • Offline access • Notifications'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleInstallClick}
            className="bg-white text-green-600 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-50 active:bg-green-100 transition-colors flex items-center space-x-1 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{isIOS ? 'How To' : 'Install'}</span>
          </button>
          
          <button
            onClick={handleDismiss}
            className="text-green-100 hover:text-white transition-colors p-1 rounded"
            aria-label="Dismiss install banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;