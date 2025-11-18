import { 
  Search, 
  Filter, 
  BarChart3, 
  DollarSign, 
  MessageCircle,
  Wallet as WalletIcon,
  User,
  TrendingUp
} from 'lucide-react';
import { L } from '../lib/lexicon';

// Updated onboarding steps that match current UI/UX
export const DISCOVER_PAGE_TOUR = {
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Fan Club Z!',
      description: 'Let\'s take a quick tour of how to discover and participate in predictions.',
      placement: 'center',
      icon: <TrendingUp className="w-6 h-6" />,
      action: 'modal',
      skipable: true
    },

    {
      id: 'search',
      title: 'Search Predictions',
      description: 'Find predictions quickly by searching for topics, events, or keywords.',
      target: 'search-bar',
      placement: 'bottom',
      icon: <Search className="w-5 h-5" />,
      action: 'spotlight'
    },
    {
      id: 'categories',
      title: 'Filter by Category',
      description: 'Browse predictions by category like Sports, Pop Culture, Tech, and more.',
      target: 'category-filters',
      placement: 'bottom',
      icon: <Filter className="w-5 h-5" />,
      action: 'spotlight'
    },
    {
      id: 'prediction-list',
      title: 'Browse Predictions',
      description: `Scroll through active predictions. Tap any card to see details and ${L("betVerb").toLowerCase()}.`,
      target: 'discover-list',
      placement: 'top',
      icon: <BarChart3 className="w-5 h-5" />,
      action: 'highlight'
    }
  ],
  autoStart: false,
  showProgress: true,
  allowSkip: true,
  theme: 'light',
  persistent: true
};

export const PREDICTION_DETAILS_TOUR = {
  steps: [
    {
      id: 'prediction-details',
      title: 'Prediction Details',
      description: 'View all the important details about this prediction including creator, category, and description.',
      placement: 'center',
      icon: <BarChart3 className="w-6 h-6" />,
      action: 'modal'
    },
    {
      id: 'prediction-options',
      title: 'Choose Your Position',
      description: `Select which outcome you want to ${L("betVerb").toLowerCase()} on. Each option shows the current pool size.`,
      placement: 'center',
      icon: <DollarSign className="w-5 h-5" />,
      action: 'modal'
    },
    {
      id: 'place-bet',
      title: 'Enter Your Stake',
      description: `Enter the amount you want to ${L("betVerb").toLowerCase()} and tap "${L("betVerb")}" to confirm. The button is positioned above the bottom navigation for easy access.`,
      placement: 'center',
      icon: <DollarSign className="w-5 h-5" />,
      action: 'modal'
    },
    {
      id: 'comments',
      title: 'Join the Discussion',
      description: 'Scroll down to read comments and discuss this prediction with other users.',
      placement: 'center',
      icon: <MessageCircle className="w-5 h-5" />,
      action: 'modal'
    }
  ],
  autoStart: false,
  showProgress: true,
  allowSkip: true,
  theme: 'light',
  persistent: true
};

export const WALLET_PAGE_TOUR = {
  steps: [
    {
      id: 'wallet-overview',
      title: 'Your Wallet',
      description: 'Manage your funds, view your balance, and track all your transactions in one place.',
      placement: 'center',
      icon: <WalletIcon className="w-6 h-6" />,
      action: 'modal'
    },
    {
      id: 'balance',
      title: 'Available Balance',
      description: 'This is your available balance. You can add funds or withdraw anytime.',
      target: 'wallet-balance',
      placement: 'bottom',
      icon: <DollarSign className="w-5 h-5" />,
      action: 'spotlight'
    },
    {
      id: 'add-funds',
      title: 'Add Funds',
      description: 'Tap here to add funds to your wallet using various payment methods.',
      target: 'add-funds-button',
      placement: 'bottom',
      icon: <DollarSign className="w-5 h-5" />,
      action: 'spotlight'
    },
    {
      id: 'transactions',
      title: 'Transaction History',
      description: `View all your deposits, withdrawals, ${L("bets")}, and ${L("winnings")} in your transaction history.`,
      target: 'transaction-history',
      placement: 'top',
      icon: <BarChart3 className="w-5 h-5" />,
      action: 'highlight'
    }
  ],
  autoStart: false,
  showProgress: true,
  allowSkip: true,
  theme: 'light',
  persistent: true
};

export const PROFILE_PAGE_TOUR = {
  steps: [
    {
      id: 'profile-overview',
      title: 'Your Profile',
      description: 'Track your prediction history, stats, and manage your account settings.',
      placement: 'center',
      icon: <User className="w-6 h-6" />,
      action: 'modal'
    },
    {
      id: 'stats',
      title: 'Your Stats',
      description: 'See your win rate, total predictions, and earnings at a glance.',
      target: 'profile-stats',
      placement: 'bottom',
      icon: <TrendingUp className="w-5 h-5" />,
      action: 'spotlight'
    },
    {
      id: 'predictions-tabs',
      title: 'Your Predictions',
      description: 'Switch between active predictions, completed ones, and predictions you\'ve created.',
      target: 'profile-tabs',
      placement: 'bottom',
      icon: <BarChart3 className="w-5 h-5" />,
      action: 'highlight'
    }
  ],
  autoStart: false,
  showProgress: true,
  allowSkip: true,
  theme: 'light',
  persistent: true
};

// Helper function to start a specific tour
export const startTour = (tourName: 'discover' | 'prediction' | 'wallet' | 'profile', onboardingHook: any) => {
  const tours = {
    discover: DISCOVER_PAGE_TOUR,
    prediction: PREDICTION_DETAILS_TOUR,
    wallet: WALLET_PAGE_TOUR,
    profile: PROFILE_PAGE_TOUR
  };
  
  const tour = tours[tourName];
  if (tour && onboardingHook) {
    onboardingHook.startOnboarding(tour);
  }
};
