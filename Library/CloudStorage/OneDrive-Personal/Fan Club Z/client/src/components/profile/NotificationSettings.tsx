import React, { useState } from 'react'
import { Bell, MessageSquare, TrendingUp, Users, Mail, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface NotificationSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  open,
  onOpenChange
}) => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [notifications, setNotifications] = useState({
    betUpdates: true,
    betResults: true,
    newBets: false,
    clubActivity: true,
    comments: true,
    likes: false,
    followers: true,
    promotions: false,
    security: true,
    email: true,
    push: true,
    sms: false
  })

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const NotificationToggle: React.FC<{
    icon: React.ReactNode
    title: string
    description: string
    key: keyof typeof notifications
    color: string
  }> = ({ icon, title, description, key, color }) => (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <Button
        variant={notifications[key] ? "default" : "outline"}
        size="sm"
        onClick={() => handleToggle(key)}
      >
        {notifications[key] ? 'On' : 'Off'}
      </Button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-purple-600" />
            <span>Notification Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Betting Notifications */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Betting Notifications</h3>
              <div className="space-y-3">
                <NotificationToggle
                  icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
                  title="Bet Updates"
                  description="Get notified when your bets are updated"
                  key="betUpdates"
                  color="bg-blue-100"
                />
                
                <NotificationToggle
                  icon={<TrendingUp className="w-4 h-4 text-green-600" />}
                  title="Bet Results"
                  description="Get notified when your bets are settled"
                  key="betResults"
                  color="bg-green-100"
                />
                
                <NotificationToggle
                  icon={<TrendingUp className="w-4 h-4 text-orange-600" />}
                  title="New Bets"
                  description="Get notified about new trending bets"
                  key="newBets"
                  color="bg-orange-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Notifications */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Social Notifications</h3>
              <div className="space-y-3">
                <NotificationToggle
                  icon={<Users className="w-4 h-4 text-purple-600" />}
                  title="Club Activity"
                  description="Get notified about club updates and events"
                  key="clubActivity"
                  color="bg-purple-100"
                />
                
                <NotificationToggle
                  icon={<MessageSquare className="w-4 h-4 text-indigo-600" />}
                  title="Comments"
                  description="Get notified when someone comments on your bets"
                  key="comments"
                  color="bg-indigo-100"
                />
                
                <NotificationToggle
                  icon={<Users className="w-4 h-4 text-pink-600" />}
                  title="Likes"
                  description="Get notified when someone likes your bets"
                  key="likes"
                  color="bg-pink-100"
                />
                
                <NotificationToggle
                  icon={<Users className="w-4 h-4 text-teal-600" />}
                  title="New Followers"
                  description="Get notified when someone follows you"
                  key="followers"
                  color="bg-teal-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Marketing Notifications */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Marketing & Promotions</h3>
              <div className="space-y-3">
                <NotificationToggle
                  icon={<Bell className="w-4 h-4 text-yellow-600" />}
                  title="Promotions"
                  description="Get notified about special offers and promotions"
                  key="promotions"
                  color="bg-yellow-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Notifications */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Security Notifications</h3>
              <div className="space-y-3">
                <NotificationToggle
                  icon={<Bell className="w-4 h-4 text-red-600" />}
                  title="Security Alerts"
                  description="Get notified about account security events"
                  key="security"
                  color="bg-red-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Methods */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Delivery Methods</h3>
              <div className="space-y-3">
                <NotificationToggle
                  icon={<Mail className="w-4 h-4 text-blue-600" />}
                  title="Email Notifications"
                  description="Receive notifications via email"
                  key="email"
                  color="bg-blue-100"
                />
                
                <NotificationToggle
                  icon={<Smartphone className="w-4 h-4 text-green-600" />}
                  title="Push Notifications"
                  description="Receive notifications on your device"
                  key="push"
                  color="bg-green-100"
                />
                
                <NotificationToggle
                  icon={<Smartphone className="w-4 h-4 text-purple-600" />}
                  title="SMS Notifications"
                  description="Receive notifications via text message"
                  key="sms"
                  color="bg-purple-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 