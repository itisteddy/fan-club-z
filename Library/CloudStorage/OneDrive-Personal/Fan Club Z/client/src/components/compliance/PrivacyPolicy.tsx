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
    <div className="max-w-5xl mx-auto px-6 py-8 lg:px-8">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-title-1 font-bold mb-4 text-gray-900">Privacy Policy</h1>
        <p className="text-body text-gray-500 mb-2">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <p className="text-body text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Learn how we collect, use, and protect your personal information
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-8 mb-12">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-title-3 font-semibold text-blue-900 mb-3">Important Notice</h3>
            <p className="text-body text-blue-800 leading-relaxed">
              This privacy policy explains how Fan Club Z collects, uses, and protects your information. 
              By using our service, you agree to this policy. We are committed to protecting your privacy and complying with 
              all applicable data protection laws.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:gap-10">
        {sections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card key={index} className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-8">
                <div className="flex items-start space-x-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-7 h-7 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-title-2 font-bold mb-3 text-gray-900">{section.title}</h3>
                    <p className="text-body text-gray-600 mb-6 leading-relaxed">{section.description}</p>
                    <div className="grid gap-3">
                      {section.content.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-start space-x-3">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-body text-gray-700 leading-relaxed">{item}</span>
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