import React, { useState, useEffect } from 'react'
import { X, Bell, Check, Trash2, Settings, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  notificationService, 
  Notification, 
  NotificationPreferences 
} from '@/services/notificationService'
import { formatDistanceToNow } from 'date-fns'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'bet_update' | 'social' | 'payment'>('all')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    // Load initial data
    setNotifications(notificationService.getNotifications())
    setPreferences(notificationService.getPreferences())

    // Subscribe to updates
    const unsubscribe = notificationService.subscribe(setNotifications)

    return unsubscribe
  }, [isOpen])

  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return !notification.read
    return notification.type === activeFilter
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId)
  }

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead()
  }

  const handleDeleteNotification = (notificationId: string) => {
    notificationService.deleteNotification(notificationId)
  }

  const handleClearAll = () => {
    notificationService.clearAllNotifications()
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return
    
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    notificationService.updatePreferences(newPreferences)
  }

  const getNotificationIcon = (type: Notification['type']) => {
    const iconClass = "w-5 h-5"
    switch (type) {
      case 'bet_update':
        return <Bell className={`${iconClass} text-blue-500`} />
      case 'social':
        return <Bell className={`${iconClass} text-green-500`} />
      case 'payment':
        return <Bell className={`${iconClass} text-purple-500`} />
      case 'kyc':
        return <Bell className={`${iconClass} text-orange-500`} />
      default:
        return <Bell className={`${iconClass} text-gray-500`} />
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'bet_update':
        return 'bg-blue-50 border-blue-200'
      case 'social':
        return 'bg-green-50 border-green-200'
      case 'payment':
        return 'bg-purple-50 border-purple-200'
      case 'kyc':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[80vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && preferences && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Settings</h3>
            <div className="space-y-3">
              {Object.entries(preferences).map(([key, value]) => {
                if (key === 'pushEnabled' || key === 'emailEnabled') return null
                
                return (
                  <label key={key} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handlePreferenceChange(key as keyof NotificationPreferences, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center space-x-2 p-4 border-b border-gray-200 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'bet_update', label: 'Bets' },
            { key: 'social', label: 'Social' },
            { key: 'payment', label: 'Payment' }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as any)}
              className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                activeFilter === filter.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="text-sm"
          >
            Mark all as read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear all
          </Button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-sm text-gray-500 text-center">
                {activeFilter === 'all' 
                  ? "You're all caught up! Check back later for updates."
                  : `No ${activeFilter} notifications`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      {notification.actionUrl && (
                        <button
                          onClick={() => {
                            window.location.href = notification.actionUrl!
                            onClose()
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                        >
                          View details →
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Check className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationCenter 