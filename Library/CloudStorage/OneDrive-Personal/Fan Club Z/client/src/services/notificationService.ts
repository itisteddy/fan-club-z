// Push Notification Service
// Handles real-time notifications for bet updates, social interactions, and system events

export interface Notification {
  id: string
  type: 'bet_update' | 'social' | 'system' | 'payment' | 'kyc'
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  createdAt: Date
  actionUrl?: string
}

export interface NotificationPreferences {
  betUpdates: boolean
  socialInteractions: boolean
  systemMessages: boolean
  paymentAlerts: boolean
  kycUpdates: boolean
  pushEnabled: boolean
  emailEnabled: boolean
}

class NotificationService {
  private notifications: Notification[] = []
  private preferences: NotificationPreferences = {
    betUpdates: true,
    socialInteractions: true,
    systemMessages: true,
    paymentAlerts: true,
    kycUpdates: true,
    pushEnabled: true,
    emailEnabled: false
  }
  private listeners: Set<(notifications: Notification[]) => void> = new Set()
  private ws: WebSocket | null = null

  constructor() {
    this.loadPreferences()
    this.loadNotifications()
    // Don't auto-connect - wait for user authentication
  }

  // Initialize WebSocket connection for real-time notifications
  private initializeWebSocket() {
    try {
      // Get authentication token
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
      
      if (!token) {
        console.log('🔔 No authentication token found, skipping WebSocket connection')
        return
      }

      // Connect with authentication token
      this.ws = new WebSocket(`ws://${window.location.hostname}:3001/ws/notifications?token=${token}`)
      
      this.ws.onopen = () => {
        console.log('🔔 WebSocket connected for notifications')
        this.requestNotificationPermission()
      }

      this.ws.onmessage = (event) => {
        const notification = JSON.parse(event.data)
        this.addNotification(notification)
      }

      this.ws.onclose = () => {
        console.log('🔔 WebSocket disconnected, attempting to reconnect...')
        setTimeout(() => this.initializeWebSocket(), 5000)
      }

      this.ws.onerror = (error) => {
        console.error('🔔 WebSocket error:', error)
      }
    } catch (error) {
      console.error('🔔 Failed to initialize WebSocket:', error)
    }
  }

  // Connect WebSocket when user logs in
  connect() {
    this.initializeWebSocket()
  }

  // Initialize demo notifications for testing
  initializeDemoNotifications() {
    // Only add demo notifications if none exist
    if (this.notifications.length === 0) {
      const demoNotifications = [
        {
          type: 'bet_update' as const,
          title: 'Bet Update',
          message: 'Your bet "Will Bitcoin hit $100K?" has new activity!',
          actionUrl: '/bets/1'
        },
        {
          type: 'social' as const,
          title: 'New Comment',
          message: 'John commented on your bet "Election Results 2024"',
          actionUrl: '/bets/2'
        },
        {
          type: 'system' as const,
          title: 'Welcome to Fan Club Z!',
          message: 'Start creating and participating in bets to earn rewards.',
          actionUrl: '/discover'
        }
      ]

      demoNotifications.forEach(notification => {
        this.addNotification(notification)
      })

      console.log('🔔 Demo notifications initialized:', this.notifications.length)
    }
  }

  // Request push notification permission
  private async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('🔔 This browser does not support notifications')
      return
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      this.preferences.pushEnabled = permission === 'granted'
      this.savePreferences()
    }
  }

  // Add a new notification
  addNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date()
    }

    this.notifications.unshift(newNotification)
    this.notifyListeners()

    // Show push notification if enabled
    if (this.preferences.pushEnabled && Notification.permission === 'granted') {
      this.showPushNotification(newNotification)
    }

    // Store in localStorage
    this.saveNotifications()
  }

  // Show push notification
  private showPushNotification(notification: Notification) {
    const pushNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.type === 'payment'
    })

    pushNotification.onclick = () => {
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl
      }
      pushNotification.close()
    }

    // Auto-close after 5 seconds (except for payment notifications)
    if (notification.type !== 'payment') {
      setTimeout(() => pushNotification.close(), 5000)
    }
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return this.notifications
  }

  // Get unread notifications
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.read)
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.notifyListeners()
      this.saveNotifications()
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.notifyListeners()
    this.saveNotifications()
  }

  // Delete notification
  deleteNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId)
    this.notifyListeners()
    this.saveNotifications()
  }

  // Clear all notifications
  clearAllNotifications() {
    this.notifications = []
    this.notifyListeners()
    this.saveNotifications()
  }

  // Get notification preferences
  getPreferences(): NotificationPreferences {
    return { ...this.preferences }
  }

  // Update notification preferences
  updatePreferences(preferences: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...preferences }
    this.savePreferences()
  }

  // Subscribe to notification updates
  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]))
  }

  // Save notifications to localStorage
  private saveNotifications() {
    try {
      localStorage.setItem('fanclubz_notifications', JSON.stringify(this.notifications))
    } catch (error) {
      console.error('Failed to save notifications:', error)
    }
  }

  // Load notifications from localStorage
  private loadNotifications() {
    try {
      const saved = localStorage.getItem('fanclubz_notifications')
      if (saved) {
        this.notifications = JSON.parse(saved).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }))
        console.log('🔔 Loaded notifications from storage:', this.notifications.length)
      } else {
        console.log('🔔 No saved notifications found')
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  // Save preferences to localStorage
  private savePreferences() {
    try {
      localStorage.setItem('fanclubz_notification_preferences', JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
    }
  }

  // Load preferences from localStorage
  private loadPreferences() {
    try {
      const saved = localStorage.getItem('fanclubz_notification_preferences')
      if (saved) {
        this.preferences = { ...this.preferences, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  // Send notification to server (for server-side notifications)
  async sendNotification(userId: string, notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          ...notification
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send notification')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to send notification:', error)
      throw error
    }
  }

  // Get notification statistics
  getStats() {
    const total = this.notifications.length
    const unread = this.notifications.filter(n => !n.read).length
    const byType = this.notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, unread, byType }
  }

  // Cleanup
  destroy() {
    if (this.ws) {
      this.ws.close()
    }
    this.listeners.clear()
  }
}

// Create singleton instance
export const notificationService = new NotificationService()

// Export convenience functions
export const {
  addNotification,
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getPreferences,
  updatePreferences,
  subscribe,
  sendNotification,
  getStats
} = notificationService 