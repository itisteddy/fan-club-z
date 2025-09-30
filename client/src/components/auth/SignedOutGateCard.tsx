import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { openAuthGate } from '../../auth/authGateAdapter';
import { AuthIntent } from '../../auth/authIntents';

interface SignedOutGateCardProps {
  icon?: React.ReactElement<{ className?: string }>;
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

/**
 * SignedOutGateCard - Consistent auth-required gate component
 * Now matches the design pattern used across Wallet, Profile, and other pages
 */
const SignedOutGateCard: React.FC<SignedOutGateCardProps> = ({
  icon,
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
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
            console.log('[FCZ-QA] Auth gate completed successfully for intent:', intent);
          }
        } else if (result.status === 'cancel') {
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
            console.log('[FCZ-QA] Auth gate cancelled by user');
          }
        } else if (result.status === 'error') {
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
            console.error('[FCZ-QA] Auth gate error:', result.reason);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
          console.error('[FCZ-QA] Auth gate exception:', error);
        }
      }
    } else {
      console.warn('SignedOutGateCard: No onPrimary or intent provided');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {/* Icon - minimal 24-32px as per design system */}
      {icon && (
        <div className="mb-4 text-gray-300">
          {React.cloneElement(icon, {
            className: 'w-6 h-6 md:w-8 md:h-8'
          })}
        </div>
      )}

      {/* Title - 16-18px */}
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
        {title || 'Sign in required'}
      </h3>

      {/* Body - 14-15px */}
      <p className="text-sm md:text-base text-gray-600 mb-6 max-w-sm leading-relaxed">
        {body || 'Please sign in to continue with this action.'}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
        {/* Primary CTA */}
        <button
          onClick={handlePrimary}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          data-qa="authgate-open"
        >
          {primaryLabel}
        </button>

        {/* Secondary CTA */}
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="px-6 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default SignedOutGateCard;
