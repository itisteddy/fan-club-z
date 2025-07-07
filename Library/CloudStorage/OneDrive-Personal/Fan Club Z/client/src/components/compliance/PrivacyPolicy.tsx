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
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-title-1 font-bold mb-2">Privacy Policy</h1>
        <p className="text-body text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-body text-blue-800">
          <strong>Important:</strong> This privacy policy explains how Fan Club Z collects, uses, and protects your information. 
          By using our service, you agree to this policy. We are committed to protecting your privacy and complying with 
          all applicable data protection laws.
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
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
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
          If you have questions about this privacy policy or our data practices, please contact us:
        </p>
        <div className="space-y-2 text-body text-gray-700">
          <p><strong>Email:</strong> privacy@fanclubz.com</p>
          <p><strong>Address:</strong> [Your Business Address]</p>
          <p><strong>Data Protection Officer:</strong> dpo@fanclubz.com</p>
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
            Accept Privacy Policy
          </Button>
        </div>
      )}
    </div>
  )
} 