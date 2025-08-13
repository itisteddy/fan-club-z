import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  timestamp: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  
  addNotification: (type, message, duration = 5000) => {
    const id = Date.now().toString();
    const notification: Notification = {
      id,
      type,
      message,
      duration,
      timestamp: Date.now()
    };
    
    set((state) => ({
      notifications: [...state.notifications, notification]
    }));
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }
  },
  
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },
  
  clearNotifications: () => {
    set({ notifications: [] });
  }
}));

// Convenience functions
export const showSuccess = (message: string, duration?: number) => {
  useNotificationStore.getState().addNotification('success', message, duration);
};

export const showError = (message: string, duration?: number) => {
  useNotificationStore.getState().addNotification('error', message, duration);
};

export const showWarning = (message: string, duration?: number) => {
  useNotificationStore.getState().addNotification('warning', message, duration);
};

export const showInfo = (message: string, duration?: number) => {
  useNotificationStore.getState().addNotification('info', message, duration);
};

export default useNotificationStore; 