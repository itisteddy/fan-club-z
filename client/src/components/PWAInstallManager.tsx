import React, { useState, useEffect } from 'react';
import PWAInstallBanner from './PWAInstallBanner';
import IOSInstallModal from './IOSInstallModal';
import SmartInstallPrompt from './SmartInstallPrompt';
import TopUpdateToast from './TopUpdateToast';
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
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'pwa_update_accepted', {
        event_category: 'engagement',
        event_label: 'app_update'
      });
    }
    
    window.location.reload();
  };

  const dismissUpdate = () => {
    setShowUpdateNotification(false);
    
    // Track update dismissal
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'pwa_update_dismissed', {
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
      
      {/* 
        Update Notification - Top-centered toast with backdrop
        Positioned to be highly visible without interfering with bottom navigation
        Uses green brand color to match app theme
      */}
      <TopUpdateToast
        isVisible={showUpdateNotification}
        onUpdate={handleUpdateApp}
        onDismiss={dismissUpdate}
      />
    </>
  );
};

export default PWAInstallManager;