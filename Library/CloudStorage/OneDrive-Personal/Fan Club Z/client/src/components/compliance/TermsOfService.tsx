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
      description: 'By using Fan Club Z, you agree to follow these terms and conditions',
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
      description: 'Requirements to join and use our betting platform',
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
      description: 'How betting works and your responsibilities as a user',
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
      description: 'Activities that are not allowed on our platform',
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
      description: 'Payment policies and financial responsibilities',
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
      description: 'Rights and ownership of content and technology',
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 lg:px-8 w-full"> {/* Enhanced: Mobile-first responsive padding without w-screen */}
      <div className="text-center mb-6 sm:mb-12"> {/* Enhanced: Responsive margin */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg"> {/* Enhanced: Responsive icon size */}
          <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" /> {/* Enhanced: Responsive icon */}
        </div>
        <h1 className="text-xl sm:text-title-1 font-bold mb-3 sm:mb-4 text-gray-900">Terms of Service</h1> {/* Enhanced: Responsive heading */}
        <p className="text-sm sm:text-body text-gray-500 mb-2"> {/* Enhanced: Responsive text */}
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <p className="text-sm sm:text-body text-gray-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0"> {/* Enhanced: Mobile padding and responsive text */}
          Your rights and responsibilities when using our betting platform
        </p>
      </div>

      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-6 sm:mb-12"> {/* Enhanced: Mobile-friendly spacing and margins */}
        <div className="flex items-start space-x-3 sm:space-x-4"> {/* Enhanced: Responsive spacing */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0"> {/* Enhanced: Responsive icon container */}
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> {/* Enhanced: Responsive icon */}
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-title-3 font-semibold text-orange-900 mb-2 sm:mb-3">Important Notice</h3> {/* Enhanced: Responsive text */}
            <p className="text-sm sm:text-body text-orange-800 leading-relaxed"> {/* Enhanced: Responsive text */}
              These terms govern your use of Fan Club Z. By using our service, 
              you acknowledge that you have read, understood, and agree to be bound by these terms. 
              If you do not agree, please do not use our service.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-8 lg:gap-10"> {/* Enhanced: Mobile-friendly gap spacing */}
        {sections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card key={index} className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"> {/* Enhanced: Mobile margin */}
              <CardContent className="p-4 sm:p-8"> {/* Enhanced: Responsive padding */}
                <div className="flex items-start space-x-3 sm:space-x-6"> {/* Enhanced: Responsive spacing */}
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0"> {/* Enhanced: Responsive icon container */}
                    <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-gray-600" /> {/* Enhanced: Responsive icon */}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-title-2 font-bold mb-2 sm:mb-3 text-gray-900">{section.title}</h3> {/* Enhanced: Responsive heading */}
                    <p className="text-sm sm:text-body text-gray-600 mb-4 sm:mb-6 leading-relaxed">{section.description}</p> {/* Enhanced: Responsive text */}
                    <div className="grid gap-2 sm:gap-3"> {/* Enhanced: Responsive gap */}
                      {section.content.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-start space-x-2 sm:space-x-3"> {/* Enhanced: Responsive spacing */}
                          <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm sm:text-body text-gray-700 leading-relaxed break-words">{item}</span> {/* Enhanced: Comprehensive text wrapping */}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border border-gray-200 rounded-2xl p-8 mt-12">
        <div className="text-center">
          <h3 className="text-title-3 font-semibold mb-4 text-gray-900">Contact Information</h3>
          <p className="text-body text-gray-600 mb-6 leading-relaxed">
            If you have questions about these terms or need legal assistance, please contact us:
          </p>
          <div className="grid gap-4 max-w-md mx-auto">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700"><strong>Email:</strong> legal@fanclubz.com</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700"><strong>Address:</strong> [Your Business Address]</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700"><strong>Legal Department:</strong> legal@fanclubz.com</p>
            </div>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex flex-col sm:flex-row gap-6 justify-center pt-12">
          <Button
            onClick={onDecline}
            variant="outline"
            className="px-8 py-4 rounded-2xl text-body font-semibold border-2 hover:bg-gray-50 transition-all duration-200"
          >
            Decline
          </Button>
          <Button
            onClick={onAccept}
            className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-4 rounded-2xl text-body font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
          >
            I Agree
          </Button>
        </div>
      )}
    </div>
  )
} 