import React from 'react'
import { FileText, AlertTriangle, Shield, Users, Scale, Gavel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface TermsOfServiceProps {
  onAccept?: () => void
  onDecline?: () => void
  showActions?: boolean
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({
  onAccept,
  onDecline,
  showActions = false
}) => {
  const sections = [
    {
      icon: Users,
      title: 'Acceptance of Terms',
      content: [
        'By accessing or using Fan Club Z, you agree to these Terms of Service',
        'You must be 18 years or older to use our services',
        'You must provide accurate and complete information during registration',
        'You are responsible for maintaining the security of your account',
        'You agree to comply with all applicable laws and regulations',
        'We reserve the right to modify these terms at any time'
      ]
    },
    {
      icon: Shield,
      title: 'Eligibility & Age Verification',
      content: [
        'Minimum age requirement: 18 years old',
        'Valid government-issued ID required for verification',
        'No exceptions for parental consent or supervision',
        'Immediate account termination for underage users',
        'Geographic restrictions may apply based on jurisdiction',
        'Compliance with local gambling laws required'
      ]
    },
    {
      icon: Scale,
      title: 'Betting Rules & Responsibilities',
      content: [
        'All bets are final once placed and confirmed',
        'You must have sufficient funds before placing bets',
        'Odds and payouts are determined by market conditions',
        'We reserve the right to void bets in exceptional circumstances',
        'Disputes will be resolved according to our dispute resolution process',
        'You are responsible for understanding bet terms before placing'
      ]
    },
    {
      icon: AlertTriangle,
      title: 'Prohibited Activities',
      content: [
        'No underage gambling or account sharing',
        'No use of automated systems or bots',
        'No manipulation of odds or market conditions',
        'No fraudulent activities or money laundering',
        'No harassment or abusive behavior toward other users',
        'No circumvention of platform security measures'
      ]
    },
    {
      icon: Gavel,
      title: 'Financial Terms',
      content: [
        'All transactions are processed in USD unless otherwise stated',
        'Minimum deposit and withdrawal amounts apply',
        'Processing fees may apply to certain transactions',
        'We are not responsible for bank fees or exchange rates',
        'Tax reporting is the responsibility of the user',
        'We comply with all financial regulations and AML requirements'
      ]
    },
    {
      icon: FileText,
      title: 'Intellectual Property',
      content: [
        'All content and software are owned by Fan Club Z',
        'You may not copy, modify, or distribute our content',
        'User-generated content remains your property',
        'You grant us license to use your content on our platform',
        'Trademarks and logos are protected intellectual property',
        'Violation of IP rights may result in account termination'
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-title-1 font-bold mb-2">Terms of Service</h1>
        <p className="text-body text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
        <p className="text-body text-orange-800">
          <strong>Important:</strong> These terms govern your use of Fan Club Z. By using our service, 
          you acknowledge that you have read, understood, and agree to be bound by these terms. 
          If you do not agree, please do not use our service.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card key={index} className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-title-3 font-semibold mb-3">{section.title}</h3>
                    <ul className="space-y-2">
                      {section.content.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start space-x-2">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-body text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-title-3 font-semibold mb-3">Contact Information</h3>
        <p className="text-body text-gray-700 mb-4">
          If you have questions about these terms or need legal assistance, please contact us:
        </p>
        <div className="space-y-2 text-body text-gray-700">
          <p><strong>Email:</strong> legal@fanclubz.com</p>
          <p><strong>Address:</strong> [Your Business Address]</p>
          <p><strong>Legal Department:</strong> legal@fanclubz.com</p>
        </div>
      </div>

      {showActions && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button
            onClick={onDecline}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            Decline
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 sm:flex-none"
          >
            Accept Terms of Service
          </Button>
        </div>
      )}
    </div>
  )
} 