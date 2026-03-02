import React, { useState, useEffect } from 'react';
import PWAInstallBanner from './PWAInstallBanner';
import IOSInstallModal from './IOSInstallModal';
import SmartInstallPrompt from './SmartInstallPrompt';
import TopUpdateToast from './TopUpdateToast';
import { getPWAManager } from '../utils/pwa';
import { supabase } from '@/lib/supabase';
import { shouldUseStoreSafeMode } from '@/config/platform';
import { Capacitor } from '@capacitor/core';

const UPDATE_SNOOZE_UNTIL_KEY = 'pwa-update-snooze-until';
const UPDATE_SNOOZE_VERSION_KEY = 'pwa-update-snooze-version';
const UPDATE_SNOOZE_MS = 12 * 60 * 60 * 1000; // 12 hours

const PWAInstallManager: React.FC = () => {
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [pendingUpdateKey, setPendingUpdateKey] = useState<string | null>(null);

  // Phase 5: PWA install UX should only render for web builds
  // Never show in native builds or store-safe mode (fail-safe guard)
  const storeSafe = shouldUseStoreSafeMode();
  const isNative = Capacitor.isNativePlatform();
  if (isNative || storeSafe) {
    console.log('[PWAInstallManager] Blocked: isNative=' + isNative + ', storeSafe=' + storeSafe);
    return null;
  }

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
    const handleUpdateAvailable = (event: Event) => {
      const customEvent = event as CustomEvent<{ updateKey?: string }>;
      const nextUpdateKey = customEvent.detail?.updateKey || null;

      try {
        const snoozeUntil = Number(localStorage.getItem(UPDATE_SNOOZE_UNTIL_KEY) || '0');
        const snoozedVersion = localStorage.getItem(UPDATE_SNOOZE_VERSION_KEY);
        const now = Date.now();

        // Suppress repeat prompts for the same update during snooze window.
        if (
          nextUpdateKey &&
          snoozeUntil > now &&
          snoozedVersion &&
          snoozedVersion === nextUpdateKey
        ) {
          return;
        }
      } catch {
        // If localStorage is unavailable, fail open and still show prompt.
      }

      setPendingUpdateKey(nextUpdateKey);
      setShowUpdateNotification(true);
    };

    // Request notification permission after user engagement
    const requestNotificationPermissionDelayed = () => {
      setTimeout(async () => {
        // Only request if user has interacted with the app and not already requested
        const hasInteracted = localStorage.getItem('user-has-interacted');
        const alreadyRequested = localStorage.getItem('notification-permission-requested');
        
        if (hasInteracted && !alreadyRequested) {
          const pwaManager = getPWAManager();
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

  const handleUpdateApp = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token && data.session.refresh_token) {
        sessionStorage.setItem(
          'fcz:update:session',
          JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        );
      }
    } catch (error) {
      console.warn('[PWA] Failed to capture session before update:', error);
    }

    // Track update acceptance
    if (typeof window !== 'undefined' && 'gtag' in window && typeof window.gtag === 'function') {
      window.gtag('event', 'pwa_update_accepted', {
        event_category: 'engagement',
        event_label: 'app_update'
      });
    }
    
    try {
      localStorage.removeItem(UPDATE_SNOOZE_UNTIL_KEY);
      localStorage.removeItem(UPDATE_SNOOZE_VERSION_KEY);
    } catch {
      // Ignore storage failures during reload flow.
    }

    window.location.reload();
  };

  const dismissUpdate = () => {
    try {
      if (pendingUpdateKey) {
        localStorage.setItem(UPDATE_SNOOZE_VERSION_KEY, pendingUpdateKey);
        localStorage.setItem(
          UPDATE_SNOOZE_UNTIL_KEY,
          String(Date.now() + UPDATE_SNOOZE_MS),
        );
      }
    } catch {
      // Ignore storage failures; dismissal should still close the UI.
    }

    setShowUpdateNotification(false);
    
    // Track update dismissal
    if (typeof window !== 'undefined' && 'gtag' in window && typeof window.gtag === 'function') {
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
