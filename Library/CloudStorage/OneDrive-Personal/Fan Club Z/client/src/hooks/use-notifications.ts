import { useState, useEffect } from 'react'
import { notificationService, Notification, NotificationPreferences } from '@/services/notificationService'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Load initial data
    setNotifications(notificationService.getNotifications())
    setPreferences(notificationService.getPreferences())
    setUnreadCount(notificationService.getUnreadNotifications().length)

    // Subscribe to updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications)
      setUnreadCount(notificationService.getUnreadNotifications().length)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    notificationService.addNotification(notification)
  }

  const markAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId)
  }

  const markAllAsRead = () => {
    notificationService.markAllAsRead()
  }

  const deleteNotification = (notificationId: string) => {
    notificationService.deleteNotification(notificationId)
  }

  const clearAllNotifications = () => {
    notificationService.clearAllNotifications()
  }

  const updatePreferences = (newPreferences: Partial<NotificationPreferences>) => {
    notificationService.updatePreferences(newPreferences)
    setPreferences(notificationService.getPreferences())
  }

  const getStats = () => {
    return notificationService.getStats()
  }

  return {
    notifications,
    preferences,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updatePreferences,
    getStats
  }
}

// Convenience hook for just the unread count
export const useUnreadNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const updateUnreadCount = () => {
      setUnreadCount(notificationService.getUnreadNotifications().length)
    }

    updateUnreadCount()
    const unsubscribe = notificationService.subscribe(updateUnreadCount)

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  return unreadCount
} 