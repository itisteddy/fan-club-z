import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
}

interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  success: (title: string, message: string, duration?: number) => void;
  error: (title: string, message: string, duration?: number) => void;
  info: (title: string, message: string, duration?: number) => void;
  warning: (title: string, message: string, duration?: number) => void;
}

let notificationCounter = 0;

export const useNotificationStore = create<NotificationState & NotificationActions>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${++notificationCounter}`;
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  success: (title, message, duration = 5000) => {
    get().addNotification({ type: 'success', title, message, duration });
  },

  error: (title, message, duration = 5000) => {
    get().addNotification({ type: 'error', title, message, duration });
  },

  info: (title, message, duration = 5000) => {
    get().addNotification({ type: 'info', title, message, duration });
  },

  warning: (title, message, duration = 5000) => {
    get().addNotification({ type: 'warning', title, message, duration });
  },
}));
