import { 
  BarChart3, 
  DollarSign,
  Wallet as WalletIcon,
  TrendingUp,
  Plus,
  Home,
  Sparkles
} from 'lucide-react';
import type { OnboardingStep } from '../components/onboarding/OnboardingSystem';
import { t } from '@/lib/lexicon';

/**
 * Streamlined Contextual Onboarding Tour
 * 
 * A concise 5-step tour focusing on the most critical features:
 * 1. Welcome
 * 2. Browse Predictions
 * 3. Create Predictions
 * 4. Track Bets
 * 5. Manage Wallet
 */

// Streamlined tour - 5 essential steps only
export const FULL_CONTEXTUAL_TOUR: OnboardingStep[] = [
  // Step 1: Welcome
  {
    id: 'welcome',
    title: 'Welcome to FanClubZ!',
    description: `Let's show you the essentials in just 5 quick steps. You'll learn how to discover predictions, create your own, track ${t('bets')}, and manage your wallet.`,
    placement: 'center',
    icon: <Sparkles className="w-6 h-6" />,
    action: 'modal',
    delay: 300
  },
  
  // Step 2: Discover Predictions (Discover page)
  {
    id: 'discover-feed',
    title: 'Discover Predictions',
    description: `Browse active predictions here. Each card shows the title, category, pool size, and closing date. Tap any card to ${t('betVerb').toLowerCase()}!`,
    target: 'discover-list',
    placement: 'top',
    offset: { y: -40 },
    icon: <BarChart3 className="w-5 h-5" />,
    action: 'highlight'
  },
  
  // Step 3: Create Predictions (Discover page - FAB)
  {
    id: 'create-prediction-fab',
    title: 'Create Your Own',
    description: 'Got an idea? Tap the plus button to create your own prediction and invite others to participate.',
    target: 'create-fab',
    placement: 'left',
    offset: { x: -16, y: -80 },
    icon: <Plus className="w-5 h-5" />,
    action: 'spotlight'
  },
  
  // Step 4: Track Bets (Navigate to Bets page)
  {
    id: 'navigate-to-bets',
    title: 'Track Your Stakes',
    description: `Visit the ${t('myBets')} tab to track all your active predictions, see predictions you've created, and review completed ${t('bets')}.`,
    target: 'tab-bets',
    placement: 'top',
    offset: { y: -40 },
    icon: <TrendingUp className="w-5 h-5" />,
    action: 'spotlight',
    onNext: async () => {
      const navigate = (window as any).__router_navigate;
      if (navigate) {
        navigate('/bets');
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  },
  
  // Step 5: Manage Wallet (Navigate to Wallet page)
  {
    id: 'navigate-to-wallet',
    title: 'Manage Your Wallet',
    description: `Your Wallet is where you add funds, withdraw ${t('winnings').toLowerCase()}, and track all transactions. Let's check it out!`,
    target: 'tab-wallet',
    placement: 'top',
    offset: { y: -40 },
    icon: <WalletIcon className="w-5 h-5" />,
    action: 'spotlight',
    onNext: async () => {
      const navigate = (window as any).__router_navigate;
      if (navigate) {
        navigate('/wallet');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // After showing wallet, return to discover
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    }
  }
];

// Quick tour - 3 essential steps (Discover page only)
export const QUICK_DISCOVER_TOUR: OnboardingStep[] = [
  {
    id: 'quick-welcome',
    title: 'Welcome!',
    description: 'Let\'s quickly show you the essentials in 3 steps.',
    placement: 'center',
    icon: <Sparkles className="w-6 h-6" />,
    action: 'modal'
  },
  {
    id: 'quick-discover',
    title: 'Browse Predictions',
    description: 'Scroll through active predictions. Tap any card to view details and place your bet.',
    target: 'discover-list',
    placement: 'top',
    offset: { y: -40 },
    icon: <BarChart3 className="w-5 h-5" />,
    action: 'highlight'
  },
  {
    id: 'quick-create',
    title: 'Create Predictions',
    description: 'Got an idea? Tap the plus button to create your own prediction. You\'re all set!',
    target: 'create-fab',
    placement: 'left',
    offset: { x: -16, y: -80 },
    icon: <Plus className="w-5 h-5" />,
    action: 'spotlight'
  }
];

// Context-aware tour configurations
export const CONTEXTUAL_TOURS = {
  full: {
    steps: FULL_CONTEXTUAL_TOUR,
    autoStart: false,
    showProgress: true,
    allowSkip: true,
    theme: 'light',
    persistent: true
  },
  quick: {
    steps: QUICK_DISCOVER_TOUR,
    autoStart: false,
    showProgress: true,
    allowSkip: true,
    theme: 'light',
    persistent: false
  }
};

