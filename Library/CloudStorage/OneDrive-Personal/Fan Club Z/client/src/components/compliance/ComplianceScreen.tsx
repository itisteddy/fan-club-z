import React from 'react'
import { Button } from '@/components/ui/button'

interface ComplianceScreenProps {
  onAccept: () => void
  onBack?: () => void
  title: string
  children: React.ReactNode
}

export const ComplianceScreen: React.FC<ComplianceScreenProps> = ({
  onAccept,
  onBack,
  title,
  children
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mr-3">
          <span className="text-white text-xl font-bold">Z</span>
        </div>
        <span className="text-lg font-semibold">Fan Club Z</span>
      </div>

      {/* Content Area - Responsive Width Usage */}
      <div className="flex-1 px-4 py-4 overflow-hidden min-h-0 w-full max-w-4xl mx-auto">
        <div className="h-full flex flex-col">
          
          {/* Title - More compact for mobile */}
          <div className="flex-shrink-0 text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">{title}</h1>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Please review and accept our terms of service
            </p>
          </div>

          {/* Terms Content - Responsive container */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden min-h-0">
            <div className="h-full p-4 sm:p-6 flex flex-col">
              <div className="flex-1 text-gray-700 leading-relaxed text-sm sm:text-base overflow-y-auto space-y-4 break-words">
                {children}
              </div>
            </div>
          </div>

          {/* Action Buttons - Responsive spacing */}
          <div className="flex-shrink-0 flex gap-3 py-2 safe-area-inset-bottom">
            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                className="flex-1 h-12 text-sm sm:text-base"
              >
                Back
              </Button>
            )}
            <Button
              onClick={onAccept}
              className={`${onBack ? 'flex-1' : 'w-full'} h-12 text-sm sm:text-base bg-green-500 hover:bg-green-600`}
            >
              I Agree
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComplianceScreen