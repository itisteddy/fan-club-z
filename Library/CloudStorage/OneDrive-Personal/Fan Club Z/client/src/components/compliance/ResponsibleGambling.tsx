import React, { useState } from 'react'
import { AlertTriangle, Shield, Clock, DollarSign, Heart, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ResponsibleGamblingProps {
  onClose?: () => void
  showActions?: boolean
}

export const ResponsibleGambling: React.FC<ResponsibleGamblingProps> = ({
  onClose,
  showActions = false
}) => {
  const [selectedLimits, setSelectedLimits] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0
  })

  const warningSigns = [
    'Spending more money than you can afford to lose',
    'Neglecting work, family, or other responsibilities',
    'Borrowing money to gamble or pay gambling debts',
    'Feeling anxious, depressed, or irritable when not gambling',
    'Trying to win back losses by gambling more',
    'Lying to family or friends about gambling activities',
    'Gambling to escape problems or negative emotions',
    'Needing to gamble with larger amounts to feel excitement'
  ]

  const helpResources = [
    {
      name: 'National Problem Gambling Helpline',
      phone: '1-800-522-4700',
      description: '24/7 confidential support and resources',
      icon: Phone
    },
    {
      name: 'Gamblers Anonymous',
      phone: '1-855-222-5542',
      description: 'Support groups and recovery programs',
      icon: Heart
    },
    {
      name: 'National Council on Problem Gambling',
      phone: '1-202-547-9204',
      description: 'Education and prevention resources',
      icon: Shield
    }
  ]

  const selfExclusionOptions = [
    {
      duration: '24 hours',
      description: 'Take a short break from gambling'
    },
    {
      duration: '7 days',
      description: 'Weekly cooling-off period'
    },
    {
      duration: '30 days',
      description: 'Monthly self-exclusion period'
    },
    {
      duration: '6 months',
      description: 'Extended break from gambling'
    },
    {
      duration: '1 year',
      description: 'Long-term self-exclusion'
    },
    {
      duration: 'Permanent',
      description: 'Permanent account closure'
    }
  ]

  const handleSetLimits = () => {
    // In a real app, this would save to the backend
    console.log('Setting limits:', selectedLimits)
    alert('Spending limits have been set successfully.')
  }

  const handleSelfExclusion = (duration: string) => {
    if (duration === 'Permanent') {
      if (confirm('Are you sure you want to permanently close your account? This action cannot be undone.')) {
        // Handle permanent closure
        console.log('Permanent self-exclusion activated')
        alert('Your account has been permanently closed.')
      }
    } else {
      if (confirm(`Are you sure you want to self-exclude for ${duration}?`)) {
        // Handle temporary self-exclusion
        console.log(`Self-exclusion activated for ${duration}`)
        alert(`Self-exclusion activated for ${duration}.`)
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-title-1 font-bold mb-2">Responsible Gambling</h1>
        <p className="text-body text-gray-500">
          We're committed to helping you gamble responsibly
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-title-3 font-semibold text-red-800 mb-2">
              Gambling Should Be Fun, Not Harmful
            </h3>
            <p className="text-body text-red-700">
              If gambling is causing problems in your life, help is available. 
              You can set limits, take breaks, or seek professional support.
            </p>
          </div>
        </div>
      </div>

      {/* Spending Limits */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="w-6 h-6 text-green-500" />
            <h3 className="text-title-3 font-semibold">Set Spending Limits</h3>
          </div>
          <p className="text-body text-gray-600 mb-4">
            Control your spending by setting daily, weekly, and monthly limits.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-body font-medium text-gray-900 mb-2 block">
                Daily Limit ($)
              </label>
              <input
                type="number"
                value={selectedLimits.daily}
                onChange={(e) => setSelectedLimits(prev => ({
                  ...prev,
                  daily: parseInt(e.target.value) || 0
                }))}
                className="w-full h-11 px-4 text-body bg-gray-100 rounded-[10px] 
                         placeholder-gray-500 focus:bg-gray-200 transition-colors"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-body font-medium text-gray-900 mb-2 block">
                Weekly Limit ($)
              </label>
              <input
                type="number"
                value={selectedLimits.weekly}
                onChange={(e) => setSelectedLimits(prev => ({
                  ...prev,
                  weekly: parseInt(e.target.value) || 0
                }))}
                className="w-full h-11 px-4 text-body bg-gray-100 rounded-[10px] 
                         placeholder-gray-500 focus:bg-gray-200 transition-colors"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-body font-medium text-gray-900 mb-2 block">
                Monthly Limit ($)
              </label>
              <input
                type="number"
                value={selectedLimits.monthly}
                onChange={(e) => setSelectedLimits(prev => ({
                  ...prev,
                  monthly: parseInt(e.target.value) || 0
                }))}
                className="w-full h-11 px-4 text-body bg-gray-100 rounded-[10px] 
                         placeholder-gray-500 focus:bg-gray-200 transition-colors"
                placeholder="0"
              />
            </div>
          </div>
          
          <Button onClick={handleSetLimits} className="w-full">
            Set Limits
          </Button>
        </CardContent>
      </Card>

      {/* Warning Signs */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <h3 className="text-title-3 font-semibold">Warning Signs</h3>
          </div>
          <p className="text-body text-gray-600 mb-4">
            If you recognize these signs in yourself or someone you know, it may be time to seek help:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {warningSigns.map((sign, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-body text-gray-700">{sign}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Self-Exclusion */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="w-6 h-6 text-blue-500" />
            <h3 className="text-title-3 font-semibold">Take a Break</h3>
          </div>
          <p className="text-body text-gray-600 mb-4">
            If you need to step away from gambling, you can temporarily or permanently exclude yourself:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {selfExclusionOptions.map((option, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{option.duration}</Badge>
                </div>
                <p className="text-body-sm text-gray-600 mb-3">{option.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelfExclusion(option.duration)}
                  className="w-full"
                >
                  {option.duration === 'Permanent' ? 'Close Account' : 'Activate'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Resources */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Phone className="w-6 h-6 text-green-500" />
            <h3 className="text-title-3 font-semibold">Get Help</h3>
          </div>
          <p className="text-body text-gray-600 mb-4">
            Professional help is available 24/7. These organizations provide confidential support:
          </p>
          
          <div className="space-y-4">
            {helpResources.map((resource, index) => {
              const Icon = resource.icon
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-body font-semibold mb-1">{resource.name}</h4>
                      <p className="text-body-sm text-gray-600 mb-2">{resource.description}</p>
                      <a
                        href={`tel:${resource.phone}`}
                        className="text-green-500 font-medium hover:underline"
                      >
                        {resource.phone}
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-title-3 font-semibold mb-3">Additional Resources</h3>
        <div className="space-y-2 text-body text-gray-700">
          <p><strong>Online Support:</strong> Visit <a href="#" className="text-blue-500 hover:underline">www.ncpgambling.org</a></p>
          <p><strong>Mobile App:</strong> Download the "Gambling Help" app for 24/7 support</p>
          <p><strong>Local Resources:</strong> Contact your state's gambling helpline for local support</p>
        </div>
      </div>

      {showActions && (
        <div className="flex justify-center pt-6">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      )}
    </div>
  )
} 