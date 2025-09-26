import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { openAuthGate } from '../../auth/authGateAdapter';
import { AuthIntent } from '../../auth/authIntents';

interface SignedOutGateCardProps {
  title?: string;
  body?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  // New auth gate specific props
  intent?: AuthIntent;
  payload?: Record<string, unknown>;
}

const SignedOutGateCard: React.FC<SignedOutGateCardProps> = ({
  title,
  body,
  primaryLabel = 'Sign In',
  onPrimary,
  secondaryLabel,
  onSecondary,
  intent,
  payload,
}) => {

  const handlePrimary = async () => {
    if (onPrimary) {
      // Use legacy callback if provided for backward compatibility
      onPrimary();
    } else if (intent) {
      // Use new auth gate adapter
      try {
        const result = await openAuthGate({ intent, payload });
        if (result.status === 'success') {
          // Auth completed successfully - the calling component should handle the resume
          console.log('[FCZ-QA] Auth gate completed successfully for intent:', intent);
        } else if (result.status === 'cancel') {
          console.log('[FCZ-QA] Auth gate cancelled by user');
        } else if (result.status === 'error') {
          console.error('[FCZ-QA] Auth gate error:', result.reason);
        }
      } catch (error) {
        console.error('[FCZ-QA] Auth gate exception:', error);
      }
    } else {
      console.warn('SignedOutGateCard: No onPrimary or intent provided');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-sm mx-auto mt-8"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
        {/* Lock Icon */}
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 mb-3" role="heading" aria-level="2">
          {title || 'Sign in required'}
        </h2>

        {/* Body */}
        <p className="text-gray-600 text-sm leading-relaxed mb-8" role="text">
          {body || 'Please sign in to continue with this action.'}
        </p>

        {/* Primary CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePrimary}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-emerald-700 transition-colors mb-4"
          data-qa="authgate-open"
          style={{ minHeight: '44px' }} // Ensure minimum touch target
        >
          {primaryLabel}
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        {/* Secondary CTA */}
        {secondaryLabel && onSecondary && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSecondary}
            className="w-full text-gray-600 py-3 px-6 rounded-xl font-medium hover:text-gray-800 hover:bg-gray-50 transition-colors"
            style={{ minHeight: '44px' }} // Ensure minimum touch target
          >
            {secondaryLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default SignedOutGateCard;
