// PWA utility functions for service worker registration and management
import { VAPID_PUBLIC_KEY } from '@/utils/environment';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAManager {
  private static instance: PWAManager;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  private init() {
    // Register service worker
    this.registerServiceWorker();
    
    // Check if app is already installed
    this.checkInstallStatus();
    
    // Listen for install prompt
    this.setupInstallPrompt();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                this.showUpdateAvailable();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private checkInstallStatus() {
    // Check if running in standalone mode
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone === true;
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      
      // Dispatch custom event for UI components
      window.dispatchEvent(new CustomEvent('pwa-installable', {
        detail: { canInstall: true }
      }));
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      
      // Track installation
      this.trackInstallation();
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      this.deferredPrompt = null;
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  public canInstall(): boolean {
    return !!this.deferredPrompt && !this.isInstalled;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public isIOSDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  public isAndroidDevice(): boolean {
    return /Android/.test(navigator.userAgent);
  }

  private showUpdateAvailable() {
    // Show update notification
    const updateEvent = new CustomEvent('pwa-update-available', {
      detail: {
        message: 'A new version of Fan Club Z is available. Refresh to update.',
        action: () => window.location.reload()
      }
    });
    window.dispatchEvent(updateEvent);
  }

  private trackInstallation() {
    // Track installation analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: 'app_install'
      });
    }
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Subscribe to push notifications
  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return existingSubscription;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY || ''
        ) as BufferSource
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      const charCode = rawData.charCodeAt(i);
      outputArray[i] = charCode;
    }
    return outputArray;
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }
}

// Initialize PWA manager
export const pwaManager = PWAManager.getInstance();