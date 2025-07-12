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
    <div className="max-w-5xl mx-auto px-6 py-8 lg:px-8">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Heart className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-title-1 font-bold mb-4 text-gray-900">Responsible Gambling</h1>
        <p className="text-body text-gray-600 max-w-2xl mx-auto leading-relaxed">
          We're committed to helping you gamble responsibly and safely. Learn about our tools and resources.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-gradient-to-r from-red-50 via-pink-50 to-red-50 border border-red-200 rounded-2xl p-8 mb-12">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-title-2 font-bold text-red-900 mb-3">
              Gambling Should Be Fun, Not Harmful
            </h3>
            <p className="text-body text-red-800 leading-relaxed">
              If gambling is causing problems in your life, help is available. 
              You can set limits, take breaks, or seek professional support. Remember, gambling should always be enjoyable entertainment, not a way to solve financial problems.
            </p>
          </div>
        </div>
      </div>

      {/* Spending Limits */}
      <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 mb-12">
        <CardContent className="p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-title-2 font-bold text-gray-900 mb-2">Set Spending Limits</h3>
              <p className="text-body text-gray-600 leading-relaxed">
                Control your spending by setting daily, weekly, and monthly limits. These help you stay within your budget.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-3">
              <label className="text-body font-semibold text-gray-900 block">
                Daily Limit ($)
              </label>
              <input
                type="number"
                value={selectedLimits.daily}
                onChange={(e) => setSelectedLimits(prev => ({
                  ...prev,
                  daily: parseInt(e.target.value) || 0
                }))}
                className="w-full h-12 px-4 text-body bg-gray-50 border border-gray-200 rounded-xl 
                         placeholder-gray-500 focus:bg-white focus:border-green-500 focus:outline-none transition-all"
                placeholder="0"
              />
            </div>
            <div className="space-y-3">
              <label className="text-body font-semibold text-gray-900 block">
                Weekly Limit ($)
              </label>
              <input
                type="number"
                value={selectedLimits.weekly}
                onChange={(e) => setSelectedLimits(prev => ({
                  ...prev,
                  weekly: parseInt(e.target.value) || 0
                }))}
                className="w-full h-12 px-4 text-body bg-gray-50 border border-gray-200 rounded-xl 
                         placeholder-gray-500 focus:bg-white focus:border-green-500 focus:outline-none transition-all"
                placeholder="0"
              />
            </div>
            <div className="space-y-3">
              <label className="text-body font-semibold text-gray-900 block">
                Monthly Limit ($)
              </label>
              <input
                type="number"
                value={selectedLimits.monthly}
                onChange={(e) => setSelectedLimits(prev => ({
                  ...prev,
                  monthly: parseInt(e.target.value) || 0
                }))}
                className="w-full h-12 px-4 text-body bg-gray-50 border border-gray-200 rounded-xl 
                         placeholder-gray-500 focus:bg-white focus:border-green-500 focus:outline-none transition-all"
                placeholder="0"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSetLimits} 
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95"
          >
            Set Limits
          </Button>
        </CardContent>
      </Card>

      {/* Warning Signs */}
      <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 mb-12">
        <CardContent className="p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-title-2 font-bold text-gray-900 mb-2">Warning Signs</h3>
              <p className="text-body text-gray-600 leading-relaxed">
                If you recognize these signs in yourself or someone you know, it may be time to seek help:
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {warningSigns.map((sign, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-body text-amber-800 leading-relaxed">{sign}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Self-Exclusion */}
      <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 mb-12">
        <CardContent className="p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-title-2 font-bold text-gray-900 mb-2">Take a Break</h3>
              <p className="text-body text-gray-600 leading-relaxed">
                If you need to step away from gambling, you can temporarily or permanently exclude yourself:
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selfExclusionOptions.map((option, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <Badge 
                    variant="outline" 
                    className={`${option.duration === 'Permanent' ? 'border-red-300 text-red-700 bg-red-50' : 'border-blue-300 text-blue-700 bg-blue-50'}`}
                  >
                    {option.duration}
                  </Badge>
                </div>
                <p className="text-body-sm text-gray-600 mb-4 leading-relaxed">{option.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelfExclusion(option.duration)}
                  className={`w-full rounded-xl font-semibold transition-all ${
                    option.duration === 'Permanent' 
                      ? 'border-red-300 text-red-700 hover:bg-red-50' 
                      : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {option.duration === 'Permanent' ? 'Close Account' : 'Activate'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Resources */}
      <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 mb-12">
        <CardContent className="p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center">
              <Phone className="w-7 h-7 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-title-2 font-bold text-gray-900 mb-2">Get Help</h3>
              <p className="text-body text-gray-600 leading-relaxed">
                Professional help is available 24/7. These organizations provide confidential support:
              </p>
            </div>
          </div>
          
          <div className="grid gap-6">
            {helpResources.map((resource, index) => {
              const Icon = resource.icon
              return (
                <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 hover:shadow-md transition-all">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-title-3 font-bold text-green-900 mb-2">{resource.name}</h4>
                      <p className="text-body text-green-700 mb-3 leading-relaxed">{resource.description}</p>
                      <a
                        href={`tel:${resource.phone}`}
                        className="inline-flex items-center text-green-600 font-semibold hover:text-green-700 transition-colors bg-white px-4 py-2 rounded-xl border border-green-200 hover:border-green-300"
                      >
                        <Phone className="w-4 h-4 mr-2" />
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
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border border-gray-200 rounded-2xl p-8 mb-12">
        <div className="text-center">
          <h3 className="text-title-3 font-semibold mb-4 text-gray-900">Additional Resources</h3>
          <div className="grid gap-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700">
                <strong>Online Support:</strong> Visit <a href="#" className="text-blue-500 hover:underline font-semibold">www.ncpgambling.org</a>
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700">
                <strong>Mobile App:</strong> Download the "Gambling Help" app for 24/7 support
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700">
                <strong>Local Resources:</strong> Contact your state's gambling helpline for local support
              </p>
            </div>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex justify-center pt-6">
          <Button 
            onClick={() => {
              console.log('🔍 ResponsibleGambling Close button clicked')
              onClose?.()
            }} 
            className="bg-red-600 hover:bg-red-700 text-white px-12 py-4 rounded-2xl text-body font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  )
} 