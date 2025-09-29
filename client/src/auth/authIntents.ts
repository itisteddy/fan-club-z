// Updated auth intents to match specification
export type AuthIntent =
  | 'view_wallet'
  | 'view_my_bets'
  | 'edit_profile'
  | 'place_prediction'
  | 'comment_prediction'
  | 'like_prediction'
  | 'add_funds'
  | 'withdraw_funds'
  | 'follow_creator'
  | 'share_private'
  | 'view_settlements';

export type IntentMeta = {
  title: string;
  description: string;
  primaryCta: string;   // "Continue with Google"
  secondaryCta: string; // "Continue with Email"
  analyticsKey: string; // for logging
};

export const INTENT_MAP: Record<AuthIntent, IntentMeta> = {
  view_wallet: {
    title: 'Sign in to view your wallet',
    description: 'See your balance, deposits, and transactions.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.view_wallet',
  },
  view_my_bets: {
    title: 'Sign in to view your predictions',
    description: 'Track your predictions and manage your portfolio.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.view_my_bets',
  },
  edit_profile: {
    title: 'Sign in to edit your profile',
    description: 'Customize your handle and avatar.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.edit_profile',
  },
  place_prediction: {
    title: 'Sign in to place a prediction',
    description: 'Stake, share, and compete on the leaderboard.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.place_prediction',
  },
  comment_prediction: {
    title: 'Sign in to comment',
    description: 'Join the discussion and share your take.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.comment_prediction',
  },
  like_prediction: {
    title: 'Sign in to like predictions',
    description: 'Save your favorites and get better recommendations.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.like_prediction',
  },
  add_funds: {
    title: 'Sign in to add funds',
    description: 'Securely top up your balance to start predicting.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.add_funds',
  },
  withdraw_funds: {
    title: 'Sign in to withdraw funds',
    description: 'For your security, we need to verify your account.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.withdraw_funds',
  },
  follow_creator: {
    title: 'Follow creators you like',
    description: 'Get alerts when your favorites make a move.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.follow_creator',
  },
  share_private: {
    title: 'Share privately',
    description: 'Keep your insights within your circle.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.share_private',
  },
  view_settlements: {
    title: 'Sign in to view settlements',
    description: 'See outcomes and claim rewards on resolved markets.',
    primaryCta: 'Continue with Google',
    secondaryCta: 'Continue with Email',
    analyticsKey: 'auth.view_settlements',
  },
};

export const FALLBACK_INTENT: IntentMeta = {
  title: 'Sign in',
  description: 'Continue to unlock this action.',
  primaryCta: 'Continue with Google',
  secondaryCta: 'Continue with Email',
  analyticsKey: 'auth.fallback',
};

// Legacy type mapping for backward compatibility
export type AuthIntentKey = AuthIntent;

// Legacy export for backward compatibility  
export interface AuthIntentMeta {
  key: AuthIntentKey;
  title: string;
  description: string;
  primaryCta: 'google' | 'email_link';
  secondaryCta?: 'google' | 'email_link';
  analyticsEvent: string;
}

// Convert new format to legacy format for backward compatibility
export const AUTH_INTENTS: Record<AuthIntentKey, AuthIntentMeta> = Object.entries(INTENT_MAP).reduce(
  (acc, [key, meta]) => ({
    ...acc,
    [key]: {
      key: key as AuthIntentKey,
      title: meta.title,
      description: meta.description,
      primaryCta: 'google' as const,
      secondaryCta: 'email_link' as const,
      analyticsEvent: meta.analyticsKey,
    },
  }),
  {} as Record<AuthIntentKey, AuthIntentMeta>
);

export default AUTH_INTENTS;
