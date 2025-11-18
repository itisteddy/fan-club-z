import React from 'react';
import { LogIn } from 'lucide-react';
import { L } from '@/lib/lexicon';

interface SignInCalloutProps {
  onSignIn: () => void;
  title?: string;
  description?: string;
}

/**
 * Compact, on-brand sign-in CTA
 * Replaces large full-width cards with a tight, actionable prompt
 */
export default function SignInCallout({ 
  onSignIn,
  title = `Sign in to ${L("betVerb").toLowerCase()}`,
  description = 'Create an account or sign in to participate.'
}: SignInCalloutProps) {
  return (
    <div className="rounded-2xl border shadow-sm bg-white p-4 flex items-center justify-between gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="shrink-0 rounded-xl bg-emerald-50 p-2">
          <LogIn className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={onSignIn}
        className="shrink-0 rounded-xl h-10 px-4 bg-emerald-600 text-white font-medium shadow hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
      >
        Sign In
      </button>
    </div>
  );
}

