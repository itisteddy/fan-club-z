import React from 'react';
import { LogIn } from 'lucide-react';
import { openAuthGate } from '@/auth/authGateAdapter';

interface SignInInlineProps {
  message?: string;
  description?: string;
}

/**
 * Compact inline sign-in prompt
 * Used in prediction details and other pages where auth is needed
 */
export default function SignInInline({ 
  message = 'Sign in to place a bet',
  description = 'Create an account or sign in to participate'
}: SignInInlineProps) {
  const handleSignIn = () => {
    openAuthGate({
      intent: 'place_prediction',
      message: 'Sign in to place predictions and win rewards'
    });
  };
  
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <LogIn className="size-5 text-muted-foreground" />
        </div>
        <div className="flex-1 text-sm">
          <div className="font-medium text-foreground">{message}</div>
          <div className="text-muted-foreground mt-0.5">{description}</div>
        </div>
        <button
          onClick={handleSignIn}
          className="ml-auto flex-shrink-0 rounded-lg px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}

