import React from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/use-notifications'

const NotificationTest: React.FC = () => {
  const { addNotification, unreadCount, getStats } = useNotifications()

  const testNotifications = [
    {
      type: 'bet_update' as const,
      title: 'Bet Update',
      message: 'Your bet "Will Bitcoin hit $100K?" has been settled!',
      actionUrl: '/bets/123'
    },
    {
      type: 'social' as const,
      title: 'New Comment',
      message: 'John commented on your bet "Election Results 2024"',
      actionUrl: '/bets/456'
    },
    {
      type: 'payment' as const,
      title: 'Payment Successful',
      message: 'Your deposit of $50 has been processed successfully',
      actionUrl: '/wallet'
    },
    {
      type: 'kyc' as const,
      title: 'KYC Approved',
      message: 'Your identity verification has been approved!',
      actionUrl: '/profile'
    },
    {
      type: 'system' as const,
      title: 'Welcome to Fan Club Z!',
      message: 'Start creating and participating in bets to earn rewards.',
      actionUrl: '/discover'
    }
  ]

  const handleAddNotification = (notification: any) => {
    addNotification(notification)
  }

  const handleAddRandomNotification = () => {
    const randomNotification = testNotifications[Math.floor(Math.random() * testNotifications.length)]
    addNotification(randomNotification)
  }

  const stats = getStats()

  return (
    <div className="p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Notification System Test</h3>
        <p className="text-blue-700 mb-4">
          Test the notification system by adding different types of notifications.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">Unread Count</p>
            <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">Total Notifications</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleAddRandomNotification}
            className="w-full"
          >
            Add Random Notification
          </Button>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {testNotifications.map((notification, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleAddNotification(notification)}
                className="text-xs"
              >
                Add {notification.type.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Notification Statistics</h4>
        <div className="space-y-1 text-sm">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="flex justify-between">
              <span className="text-gray-600 capitalize">{type.replace('_', ' ')}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NotificationTest 