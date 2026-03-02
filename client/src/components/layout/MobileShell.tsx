import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FCZ_UNIFIED_HEADER } from '@/utils/environment';
import MobileHeader from './MobileHeader';
import { t } from '@/lib/lexicon';

interface MobileShellProps {
  children: React.ReactNode;
  overrideHeader?: {
    title: string;
    leftAction?: {
      type: 'back' | 'close' | 'none';
      onClick?: () => void;
      'aria-label'?: string;
    };
    rightAction?: {
      type: 'menu' | 'custom' | 'none';
      icon?: React.ReactNode;
      onClick?: () => void;
      'aria-label'?: string;
    };
    statusChip?: {
      label: string;
      variant: 'success' | 'warning' | 'info' | 'neutral';
    };
  };
  className?: string;
}

const MobileShell: React.FC<MobileShellProps> = ({ 
  children, 
  overrideHeader,
  className = '' 
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get header configuration based on current route
  const getHeaderConfig = () => {
    if (overrideHeader) {
      return overrideHeader;
    }

    const path = location.pathname;

    // Route-specific header configurations
    switch (true) {
      case path === '/':
      case path === '/discover':
        return {
          title: 'Discover',
          leftAction: { type: 'none' as const },
          rightAction: { type: 'none' as const }
        };

      case path === '/my-bets':
        return {
          title: t('myBets'),
          leftAction: { type: 'none' as const },
          rightAction: { type: 'none' as const }
        };

      case path === '/wallet':
        return {
          title: 'Wallet',
          leftAction: { type: 'none' as const },
          rightAction: { type: 'none' as const }
        };

      case path === '/leaderboard':
        return {
          title: 'Leaderboard',
          leftAction: { type: 'none' as const },
          rightAction: { type: 'none' as const }
        };

      case path === '/profile':
      case path.startsWith('/profile/'):
        return {
          title: 'Profile',
          leftAction: path === '/profile' 
            ? { type: 'none' as const }
            : { 
                type: 'back' as const, 
                onClick: () => navigate(-1),
                'aria-label': 'Go back'
              },
          rightAction: { type: 'none' as const }
        };

      case path.startsWith('/prediction/'):
      case path.match(/^\/p\/[^/]+/) !== null:
        return {
          title: 'Prediction Details',
          leftAction: { 
            type: 'back' as const, 
            onClick: () => navigate(-1),
            'aria-label': 'Go back'
          },
          rightAction: { type: 'none' as const }
        };

      case path === '/create':
        return {
          title: 'Create Prediction',
          leftAction: { 
            type: 'close' as const, 
            onClick: () => navigate('/'),
            'aria-label': 'Close and go to Discover'
          },
          rightAction: { type: 'none' as const }
        };

      default:
        return {
          title: 'Fan Club Z',
          leftAction: { type: 'none' as const },
          rightAction: { type: 'none' as const }
        };
    }
  };

  const headerConfig = getHeaderConfig();

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Feature Flag: VITE_FCZ_UNIFIED_HEADER - Temporarily disabled while we fix page headers */}
      {false && FCZ_UNIFIED_HEADER ? (
        <MobileHeader {...headerConfig} />
      ) : null}
      
      {/* Main Content */}
      <main 
        className="flex-1"
        style={{
          paddingTop: FCZ_UNIFIED_HEADER ? '0' : undefined
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default MobileShell;
