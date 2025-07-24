import React from 'react'
import { Shield, Lock, Eye, Users, Database, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface PrivacyPolicyProps {
  onAccept?: () => void
  onDecline?: () => void
  showActions?: boolean
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  onAccept,
  onDecline,
  showActions = false
}) => {
  const sections = [
    {
      icon: Eye,
      title: 'Information We Collect',
      description: 'Here\'s what data we collect to provide our services',
      content: [
        'Personal information (name, email, date of birth)',
        'Identity verification documents (KYC)',
        'Financial information for payments',
        'Betting activity and preferences',
        'Device and usage information',
        'Location data for compliance'
      ]
    },
    {
      icon: Users,
      title: 'How We Use Your Information',
      description: 'How we use your data to provide and improve our services',
      content: [
        'Provide betting services and account management',
        'Verify your identity and age (18+)',
        'Process payments and transactions',
        'Comply with legal and regulatory requirements',
        'Prevent fraud and ensure platform security',
        'Improve our services and user experience'
      ]
    },
    {
      icon: Database,
      title: 'Data Storage & Security',
      description: 'How we protect your information with advanced security',
      content: [
        'Encrypted data storage using industry standards',
        'Secure transmission via HTTPS/TLS',
        'Regular security audits and monitoring',
        'Limited access to personal information',
        'Data retention for 7 years (legal requirement)',
        'Right to data deletion (GDPR compliance)'
      ]
    },
    {
      icon: Globe,
      title: 'Data Sharing',
      description: 'When and why we might share your information',
      content: [
        'We do not sell your personal information',
        'Share with payment processors (Stripe)',
        'Share with identity verification services',
        'Share with regulatory authorities when required',
        'Share with law enforcement when legally required',
        'Aggregated, anonymized data for analytics'
      ]
    },
    {
      icon: Lock,
      title: 'Your Rights',
      description: 'Your control over your personal information',
      content: [
        'Access your personal information',
        'Correct inaccurate information',
        'Request data deletion (with limitations)',
        'Opt-out of marketing communications',
        'File complaints with data protection authorities',
        'Withdraw consent for data processing'
      ]
    },
    {
      icon: Shield,
      title: 'Age Verification & Protection',
      description: 'How we ensure our platform is safe for adults only',
      content: [
        'Strict 18+ age verification required',
        'No collection of data from minors',
        'Parental consent not accepted for under 18s',
        'Immediate account termination for underage users',
        'Reporting mechanisms for age violations',
        'Regular age verification checks'
      ]
    }
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 lg:px-8 w-full"> {/* Enhanced: Mobile-first responsive padding without w-screen */}
      <div className="text-center mb-6 sm:mb-12"> {/* Enhanced: Responsive margin */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg"> {/* Enhanced: Responsive icon size */}
          <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" /> {/* Enhanced: Responsive icon */}
        </div>
        <h1 className="text-xl sm:text-title-1 font-bold mb-3 sm:mb-4 text-gray-900">Privacy Policy</h1> {/* Enhanced: Responsive heading */}
        <p className="text-sm sm:text-body text-gray-500 mb-2"> {/* Enhanced: Responsive text */}
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <p className="text-sm sm:text-body text-gray-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0"> {/* Enhanced: Mobile padding and responsive text */}
          Learn how we collect, use, and protect your personal information
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-6 sm:mb-12"> {/* Enhanced: Mobile-friendly spacing and margins */}
        <div className="flex items-start space-x-3 sm:space-x-4"> {/* Enhanced: Responsive spacing */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0"> {/* Enhanced: Responsive icon container */}
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> {/* Enhanced: Responsive icon */}
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-title-3 font-semibold text-blue-900 mb-2 sm:mb-3">Important Notice</h3> {/* Enhanced: Responsive text */}
            <p className="text-sm sm:text-body text-blue-800 leading-relaxed"> {/* Enhanced: Responsive text */}
              This privacy policy explains how Fan Club Z collects, uses, and protects your information. 
              By using our service, you agree to this policy. We are committed to protecting your privacy and complying with 
              all applicable data protection laws.
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
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
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
            If you have questions about this privacy policy or our data practices, please contact us:
          </p>
          <div className="grid gap-4 max-w-md mx-auto">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700"><strong>Email:</strong> privacy@fanclubz.com</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700"><strong>Address:</strong> [Your Business Address]</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-body text-gray-700"><strong>Data Protection Officer:</strong> dpo@fanclubz.com</p>
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl text-body font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
          >
            I Agree
          </Button>
        </div>
      )}
    </div>
  )
} 