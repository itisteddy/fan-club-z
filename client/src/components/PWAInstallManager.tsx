import React, { useState, useEffect } from 'react';
import PWAInstallBanner from './PWAInstallBanner';
import IOSInstallModal from './IOSInstallModal';
import SmartInstallPrompt from './SmartInstallPrompt';
import { pwaManager } from '../utils/pwa';

const PWAInstallManager: React.FC = () => {
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  useEffect(() => {
    // Track session start for timing calculations
    if (!localStorage.getItem('session-start')) {
      localStorage.setItem('session-start', Date.now().toString());
    }

    // Listen for iOS install prompt
    const handleIOSInstallPrompt = () => {
      setShowIOSModal(true);
    };

    // Listen for app updates
    const handleUpdateAvailable = (event: any) => {
      setShowUpdateNotification(true);
    };

    // Request notification permission after user engagement
    const requestNotificationPermissionDelayed = () => {
      setTimeout(async () => {
        // Only request if user has interacted with the app and not already requested
        const hasInteracted = localStorage.getItem('user-has-interacted');
        const alreadyRequested = localStorage.getItem('notification-permission-requested');
        
        if (hasInteracted && !alreadyRequested) {
          const granted = await pwaManager.requestNotificationPermission();
          localStorage.setItem('notification-permission-requested', 'true');
          
          if (granted) {
            // Subscribe to push notifications
            await pwaManager.subscribeToPushNotifications();
          }
        }
      }, 15000); // Wait 15 seconds after load
    };

    window.addEventListener('show-ios-install', handleIOSInstallPrompt);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    // Track user interaction for notification permission
    const trackInteraction = () => {
      localStorage.setItem('user-has-interacted', 'true');
      requestNotificationPermissionDelayed();
    };

    // Listen for first meaningful user interaction
    const interactionEvents = ['click', 'scroll', 'touchstart'];
    interactionEvents.forEach(event => {
      document.addEventListener(event, trackInteraction, { once: true, passive: true });
    });

    // Track app usage patterns
    const trackUsagePatterns = () => {
      const visitCount = parseInt(localStorage.getItem('visit-count') || '0') + 1;
      localStorage.setItem('visit-count', visitCount.toString());
      localStorage.setItem('last-visit', Date.now().toString());
      
      // Track returning users for better install targeting
      if (visitCount > 1) {
        localStorage.setItem('is-returning-user', 'true');
      }
    };

    trackUsagePatterns();

    return () => {
      window.removeEventListener('show-ios-install', handleIOSInstallPrompt);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      
      interactionEvents.forEach(event => {
        document.removeEventListener(event, trackInteraction);
      });
    };
  }, []);

  const handleUpdateApp = () => {
    // Track update acceptance
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_update_accepted', {
        event_category: 'engagement',
        event_label: 'app_update'
      });
    }
    
    window.location.reload();
  };

  const dismissUpdate = () => {
    setShowUpdateNotification(false);
    
    // Track update dismissal
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_update_dismissed', {
        event_category: 'engagement',
        event_label: 'app_update'
      });
    }
  };

  return (
    <>
      {/* Top Install Banner - Shows immediately when install is available */}
      <PWAInstallBanner />
      
      {/* Smart Install Prompt - Shows based on user engagement */}
      <SmartInstallPrompt />
      
      {/* iOS Install Modal - Shows detailed instructions for iOS users */}
      <IOSInstallModal 
        isOpen={showIOSModal} 
        onClose={() => setShowIOSModal(false)} 
      />
      
      {/* Update Notification - Shows when new version is available */}
      {showUpdateNotification && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Update Available
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  A new version of Fan Club Z is ready with improvements and bug fixes.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdateApp}
                    className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={dismissUpdate}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-2"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallManager;