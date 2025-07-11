import React, { useState } from 'react'
import { HelpCircle, MessageCircle, Phone, Mail, FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface HelpSupportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FAQItem {
  question: string
  answer: string
  category: string
}

export const HelpSupport: React.FC<HelpSupportProps> = ({
  open,
  onOpenChange
}) => {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { toast } = useToast()

  const [faqs] = useState<FAQItem[]>([
    {
      question: "How do I place a bet?",
      answer: "To place a bet, navigate to the Discover tab, find a bet you're interested in, tap on it to view details, and then tap 'Place Bet' to enter your stake amount and confirm.",
      category: "betting"
    },
    {
      question: "How do I withdraw my winnings?",
      answer: "Go to your Wallet tab, tap 'Withdraw', enter the amount you want to withdraw, select your preferred payment method, and confirm the withdrawal. Processing typically takes 1-3 business days.",
      category: "payments"
    },
    {
      question: "What happens if I lose my bet?",
      answer: "If you lose a bet, the stake amount is deducted from your wallet balance. You can view your betting history in the My Bets tab to track all your past bets and their outcomes.",
      category: "betting"
    },
    {
      question: "How do I create my own bet?",
      answer: "Navigate to the Create tab, fill in the bet details including title, description, options, end date, and minimum stake. Submit for review and your bet will be live once approved.",
      category: "betting"
    },
    {
      question: "Is my money safe?",
      answer: "Yes, we use bank-level security and encryption to protect your funds. All transactions are processed through secure payment gateways and we never store your full payment details.",
      category: "security"
    },
    {
      question: "How do I join a club?",
      answer: "Browse clubs in the Clubs tab, find one you're interested in, and tap 'Join Club'. Some clubs may require approval from the club owner before you can become a member.",
      category: "social"
    },
    {
      question: "What are the age requirements?",
      answer: "You must be 18 years or older to use Fan Club Z. We verify your age during the registration process and may require additional documentation.",
      category: "account"
    },
    {
      question: "How do I report a problem?",
      answer: "You can report issues through the Help & Support section, contact us via email at support@fanclubz.com, or use the in-app chat feature for immediate assistance.",
      category: "support"
    }
  ])

  const filteredFAQs = faqs.filter(faq => 
    selectedCategory === 'all' || faq.category === selectedCategory
  )

  const categories = [
    { id: 'all', name: 'All Questions' },
    { id: 'betting', name: 'Betting' },
    { id: 'payments', name: 'Payments' },
    { id: 'security', name: 'Security' },
    { id: 'social', name: 'Social Features' },
    { id: 'account', name: 'Account' },
    { id: 'support', name: 'Support' }
  ]

  const handleContactSupport = (method: string) => {
    switch (method) {
      case 'email':
        window.open('mailto:support@fanclubz.com', '_blank')
        break
      case 'phone':
        window.open('tel:+1-555-123-4567', '_blank')
        break
      case 'chat':
        toast({
          title: "Live Chat",
          description: "Live chat feature would open here in a real app.",
        })
        break
    }
  }

  const handleViewDocumentation = () => {
    toast({
      title: "Documentation",
      description: "This would open our comprehensive documentation in a new tab.",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-gray-600" />
            <span>Help & Support</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Contact */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Get Help Quickly</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  onClick={() => handleContactSupport('chat')}
                  className="flex items-center space-x-2"
                  variant="outline"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Live Chat</span>
                </Button>
                <Button
                  onClick={() => handleContactSupport('email')}
                  className="flex items-center space-x-2"
                  variant="outline"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Support</span>
                </Button>
                <Button
                  onClick={() => handleContactSupport('phone')}
                  className="flex items-center space-x-2"
                  variant="outline"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Us</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documentation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Documentation</h3>
                    <p className="text-sm text-gray-600">Comprehensive guides and tutorials</p>
                  </div>
                </div>
                <Button
                  onClick={handleViewDocumentation}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Docs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
              
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              {/* FAQ Items */}
              <div className="space-y-3">
                {filteredFAQs.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === `${index}` ? null : `${index}`)}
                      className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="font-medium">{faq.question}</span>
                      {expandedFAQ === `${index}` ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedFAQ === `${index}` && (
                      <div className="px-4 pb-4">
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Email Support</p>
                      <p className="text-sm text-gray-600">support@fanclubz.com</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleContactSupport('email')}
                    variant="outline"
                    size="sm"
                  >
                    Contact
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium">Phone Support</p>
                      <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleContactSupport('phone')}
                    variant="outline"
                    size="sm"
                  >
                    Call
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="font-medium">Live Chat</p>
                      <p className="text-sm text-gray-600">Available 24/7</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleContactSupport('chat')}
                    variant="outline"
                    size="sm"
                  >
                    Start Chat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Hours */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Support Hours</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Live Chat:</strong> 24/7</p>
              <p><strong>Phone Support:</strong> Monday - Friday, 9 AM - 6 PM EST</p>
              <p><strong>Email Support:</strong> Response within 24 hours</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 