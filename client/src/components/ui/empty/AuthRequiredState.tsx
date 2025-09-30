import React from 'react';
import { LucideIcon } from 'lucide-react';
import EmptyState from './EmptyState';
import { openAuthGate } from '../../../auth/authGateAdapter';

type AuthRequiredStateProps = {
  icon: React.ReactElement<{ className?: string }>;
  title: string;
  description: string;
  intent?: 'view_bets' | 'view_wallet' | 'edit_profile' | 'place_prediction' | string;
  payload?: Record<string, any>;
  className?: string;
};

/**
 * Reusable component for showing auth-required state across all pages
 * Provides consistent UI/UX when user needs to sign in
 */
export function AuthRequiredState({ 
  icon, 
  title, 
  description, 
  intent = 'view_bets',
  payload,
  className 
}: AuthRequiredStateProps) {
  const handleSignIn = async () => {
    try {
      await openAuthGate({ intent, payload });
    } catch (error) {
      console.error('Auth gate error:', error);
    }
  };

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      primaryAction={
        <button
          onClick={handleSignIn}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          Sign In
        </button>
      }
      className={className}
    />
  );
}

export default AuthRequiredState;
