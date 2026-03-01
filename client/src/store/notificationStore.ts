import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildPredictionCanonicalUrl } from '@/lib/predictionUrls';
import { formatCurrency } from '@/lib/format';

export interface Notification {
  id: string;
  type: 'prediction_outcome' | 'comment' | 'payout' | 'market_close' | 'like' | 'follow' | 'general' | 'settlement_ready' | 'settlement_completed';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any; // Additional data for navigation/actions
}

export interface NotificationSettings {
  predictionOutcomes: boolean;
  comments: boolean;
  marketClosing: boolean;
  payouts: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  toasts: ToastNotification[];
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  
  // Toast actions
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Push notification actions
  requestPermission: () => Promise<boolean>;
  subscribeToPush: () => Promise<void>;
  unsubscribeFromPush: () => Promise<void>;
  sendPushNotification: (notification: Notification) => void;
  
  // Utility functions
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  
  // Settlement notification helpers
  notifySettlementReady: (predictionId: string, predictionTitle: string) => void;
  notifySettlementCompleted: (predictionId: string, predictionTitle: string, outcome: 'won' | 'lost', payout?: number) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      toasts: [],
      settings: {
        predictionOutcomes: true,
        comments: true,
        marketClosing: true,
        payouts: true,
        pushNotifications: true,
        emailNotifications: false,
        frequency: 'immediate',
      },

      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          read: false,
        };

        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

        // Show toast for important notifications
        if (['prediction_outcome', 'payout'].includes(notification.type)) {
          get().addToast({
            type: 'success',
            title: notification.title,
            message: notification.message,
            duration: 5000,
          });
        }

        // Send push notification if enabled
        if (get().settings.pushNotifications) {
          get().sendPushNotification(notification);
        }
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      deleteNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          const wasUnread = notification && !notification.read;
          
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },

      clearAllNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      addToast: (toastData) => {
        const toast: ToastNotification = {
          ...toastData,
          id: crypto.randomUUID(),
        };

        set((state) => ({
          toasts: [...state.toasts, toast],
        }));
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      clearToasts: () => {
        set({ toasts: [] });
      },

      requestPermission: async () => {
        if (!('Notification' in window)) {
          console.warn('This browser does not support notifications');
          return false;
        }

        if (Notification.permission === 'granted') {
          return true;
        }

        if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }

        return false;
      },

      subscribeToPush: async () => {
        const hasPermission = await get().requestPermission();
        if (!hasPermission) {
          throw new Error('Notification permission denied');
        }

        // TODO: Implement actual push subscription with service worker
        console.log('Push notifications subscribed');
        
        set((state) => ({
          settings: { ...state.settings, pushNotifications: true },
        }));
      },

      unsubscribeFromPush: async () => {
        // TODO: Implement actual push unsubscription
        console.log('Push notifications unsubscribed');
        
        set((state) => ({
          settings: { ...state.settings, pushNotifications: false },
        }));
      },

      // Helper method to send push notifications
      sendPushNotification: (notification: Notification) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
          return;
        }

        const pushOptions: NotificationOptions & { renotify?: boolean } = {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-badge.png',
          tag: notification.id,
          renotify: false,
        };

        const pushNotification = new Notification(notification.title, pushOptions);

        pushNotification.onclick = () => {
          window.focus();
          pushNotification.close();
          
          // Handle navigation based on notification type
          if (notification.data?.predictionId) {
            // Navigate to prediction detail (canonical URL)
            window.location.href = buildPredictionCanonicalUrl(notification.data.predictionId);
          }
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          pushNotification.close();
        }, 5000);
      },

      // Settlement notification helpers
      notifySettlementReady: (predictionId: string, predictionTitle: string) => {
        const { addNotification, addToast } = get();
        
        // Add persistent notification
        addNotification({
          type: 'settlement_ready',
          title: 'Settlement Required',
          message: `"${predictionTitle}" needs your validation. Tap to review the outcome.`,
          data: { predictionId, action: 'validate_settlement' }
        });
        
        // Show toast notification
        addToast({
          type: 'info',
          title: '⚖️ Settlement Ready',
          message: `Tap to validate the outcome of "${predictionTitle}"`,
          duration: 8000,
        });
      },

      notifySettlementCompleted: (predictionId: string, predictionTitle: string, outcome: 'won' | 'lost', payout?: number) => {
        const { addNotification, addToast } = get();
        
        const message = outcome === 'won' 
          ? `You won ${payout ? formatCurrency(Number(payout), { compact: false }) : ''} on "${predictionTitle}"!`
          : `Settlement completed for "${predictionTitle}". Better luck next time!`;
          
        // Add persistent notification
        addNotification({
          type: 'settlement_completed',
          title: outcome === 'won' ? 'You Won!' : 'Settlement Complete',
          message,
          data: { predictionId, outcome, payout }
        });
        
        // Show toast notification
        addToast({
          type: outcome === 'won' ? 'success' : 'info',
          title: outcome === 'won' ? '🎉 You Won!' : '📋 Settlement Complete',
          message,
          duration: outcome === 'won' ? 10000 : 6000,
        });
      },

      showSuccess: (message: string, title?: string) => {
        get().addToast({
          type: 'success',
          title: title || 'Success',
          message,
          duration: 3000,
        });
      },

      showError: (message: string, title?: string) => {
        get().addToast({
          type: 'error',
          title: title || 'Error',
          message,
          duration: 5000,
        });
      },
    }),
    {
      name: 'fanclubz-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
        settings: state.settings,
      }),
    }
  )
);

// Helper functions for common notification types
export const notificationHelpers = {
  predictionWin: (predictionTitle: string, amount: number, predictionId: string) =>
    useNotificationStore.getState().addNotification({
      type: 'prediction_outcome',
      title: '🎉 You won!',
      message: `Your prediction "${predictionTitle}" was correct! You earned ${formatCurrency(amount, { compact: false })}.`,
      data: { predictionId, amount },
    }),

  predictionLoss: (predictionTitle: string, predictionId: string) =>
    useNotificationStore.getState().addNotification({
      type: 'prediction_outcome',
      title: 'Prediction resolved',
      message: `Your prediction "${predictionTitle}" didn't win this time. Better luck next time!`,
      data: { predictionId },
    }),

  newComment: (predictionTitle: string, commenterName: string, predictionId: string) =>
    useNotificationStore.getState().addNotification({
      type: 'comment',
      title: 'New comment',
      message: `${commenterName} commented on "${predictionTitle}"`,
      data: { predictionId, commenterName },
    }),

  marketClosingSoon: (predictionTitle: string, timeLeft: string, predictionId: string) =>
    useNotificationStore.getState().addNotification({
      type: 'market_close',
      title: 'Market closing soon',
      message: `"${predictionTitle}" closes in ${timeLeft}. Make your final predictions!`,
      data: { predictionId, timeLeft },
    }),

  payoutReceived: (amount: number, transactionId: string) =>
    useNotificationStore.getState().addNotification({
      type: 'payout',
      title: 'Payout received',
      message: `${formatCurrency(amount, { compact: false })} has been added to your wallet.`,
      data: { amount, transactionId },
    }),

  showSuccessToast: (message: string) =>
    useNotificationStore.getState().addToast({
      type: 'success',
      title: 'Success',
      message,
      duration: 3000,
    }),

  showErrorToast: (message: string) =>
    useNotificationStore.getState().addToast({
      type: 'error',
      title: 'Error',
      message,
      duration: 5000,
    }),

  showInfoToast: (message: string) =>
    useNotificationStore.getState().addToast({
      type: 'info',
      title: 'Info',
      message,
      duration: 4000,
    }),
};

// Export the missing functions
export const showSuccess = (message: string, title?: string) => {
  useNotificationStore.getState().addToast({
    type: 'success',
    title: title || 'Success',
    message,
    duration: 3000,
  });
};

export const showError = (message: string, title?: string) => {
  useNotificationStore.getState().addToast({
    type: 'error',
    title: title || 'Error',
    message,
    duration: 5000,
  });
};

// Settlement notification helpers
export const notifySettlementReady = (predictionId: string, predictionTitle: string) => {
  const store = useNotificationStore.getState();
  
  // Add persistent notification
  store.addNotification({
    type: 'settlement_ready',
    title: 'Settlement Required',
    message: `"${predictionTitle}" needs your validation. Tap to review the outcome.`,
    data: { predictionId, action: 'validate_settlement' }
  });
  
  // Show toast notification
  store.addToast({
    type: 'info',
    title: '⚖️ Settlement Ready',
    message: `Tap to validate the outcome of "${predictionTitle}"`,
    duration: 8000,
  });
};

export const notifySettlementCompleted = (predictionId: string, predictionTitle: string, outcome: 'won' | 'lost', payout?: number) => {
  const store = useNotificationStore.getState();
  
  const message = outcome === 'won' 
    ? `You won ${payout ? formatCurrency(Number(payout), { compact: false }) : ''} on "${predictionTitle}"!`
    : `Settlement completed for "${predictionTitle}". Better luck next time!`;
    
  // Add persistent notification
  store.addNotification({
    type: 'settlement_completed',
    title: outcome === 'won' ? 'You Won!' : 'Settlement Complete',
    message,
    data: { predictionId, outcome, payout }
  });
  
  // Show toast notification
  store.addToast({
    type: outcome === 'won' ? 'success' : 'info',
    title: outcome === 'won' ? '🎉 You Won!' : '📋 Settlement Complete',
    message,
    duration: outcome === 'won' ? 10000 : 6000,
  });
};
