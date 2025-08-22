// Enhanced Onboarding Tour Manager
// This file provides backward compatibility with the existing tour system
// while redirecting to the new enhanced onboarding system

import { useOnboarding } from './EnhancedOnboardingProvider';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  onNext?: () => Promise<void> | void;
}

// Legacy compatibility - redirect to enhanced system
export const useTour = () => {
  const { startFullTour } = useOnboarding();
  
  return {
    startTour: (steps: TourStep[]) => {
      console.log('Legacy tour system called, redirecting to enhanced onboarding...');
      startFullTour();
    },
    isOpen: false,
    steps: [],
    index: 0,
    stopTour: () => {},
    next: () => {},
    prev: () => {}
  };
};

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  // This component is now handled by EnhancedOnboardingProvider
  return <>{children}</>;
};