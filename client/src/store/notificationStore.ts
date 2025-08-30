import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'prediction_settled' | 'comment_received' | 'like_received' | 'follow_received' | 'achievement_earned' | 'system';
  title: string;
  message: string;
  data?: {
    prediction_id?: string;
    comment_id?: string;
    user_id?: string;
    amount?: number;
    achievement_name?: string;
  };
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

interface NotificationActions {
  initializeNotifications: () => Promise<void>;
  fetchNotifications: (limit?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearError: () => void;
  addNotificationFromRealtime: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  initializeNotifications: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ No authenticated user, skipping notification initialization');
        return;
      }

      console.log('🔄 Initializing notification store for user:', user.id);
      await get().fetchNotifications(10); // Load last 10 notifications

    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      set({ error: 'Failed to load notifications' });
    }
  },

  fetchNotifications: async (limit = 20) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      set({ loading: true, error: null });

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

      set({ 
        notifications: notifications || [], 
        unreadCount,
        loading: false 
      });

      console.log('✅ Notifications loaded:', {
        total: notifications?.length || 0,
        unread: unreadCount
      });

    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ error: 'Failed to fetch notifications', loading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Update local state
      set(state => ({
        notifications: state.notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));

    } catch (error) {
      console.error('Error marking notification as read:', error);
      set({ error: 'Failed to mark notification as read' });
    }
  },

  markAllAsRead: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      // Update local state
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      set({ error: 'Failed to mark notifications as read' });
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Update local state
      set(state => {
        const notification = state.notifications.find(n => n.id === notificationId);
        return {
          notifications: state.notifications.filter(n => n.id !== notificationId),
          unreadCount: notification?.is_read ? state.unreadCount : Math.max(0, state.unreadCount - 1)
        };
      });

    } catch (error) {
      console.error('Error deleting notification:', error);
      set({ error: 'Failed to delete notification' });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  addNotificationFromRealtime: (notification: Notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  }
}));
