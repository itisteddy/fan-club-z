import React from 'react';
import { useLocation } from 'wouter';
import { useTour } from './TourProvider';

const TourBootstrap: React.FC = () => {
  const { startTour } = useTour();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === '1') {
      // Build cross-screen tour with simple navigations between tabs
      startTour([
        {
          id: 'discover-tab',
          target: 'tab-discover',
          title: 'Discover',
          description: 'Browse live and trending predictions tailored for you.',
        },
        {
          id: 'discover-list',
          target: 'discover-list',
          title: 'Predictions Feed',
          description: 'Tap any card to view details, options, and participate.',
        },
        {
          id: 'bets-tab',
          target: 'tab-bets',
          title: 'My Bets',
          description: 'Track Active, Created, and Completed predictions.',
          onNext: () => navigate('/predictions'),
        },
        {
          id: 'bets-tabs',
          target: 'bets-tabs',
          title: 'Bet Management',
          description: 'Switch between Active, Created, and Completed.',
        },
        {
          id: 'wallet-tab',
          target: 'tab-wallet',
          title: 'Wallet',
          description: 'Manage your balance and view transactions.',
          onNext: () => navigate('/wallet'),
        },
        {
          id: 'wallet-balance',
          target: 'wallet-balance',
          title: 'Balance',
          description: 'Your available balance is displayed here.',
        },
        {
          id: 'wallet-actions',
          target: 'wallet-actions',
          title: 'Quick Actions',
          description: 'Add demo funds or reset in demo mode.',
        },
        {
          id: 'profile-tab',
          target: 'tab-profile',
          title: 'Profile',
          description: 'Access settings, notifications, and achievements.',
          onNext: () => navigate('/profile'),
        },
        {
          id: 'profile-header',
          target: 'profile-header',
          title: 'Profile Header',
          description: 'Edit your profile and review performance metrics.',
        },
      ]);
    }
    // Run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default TourBootstrap;


