// Enhanced Onboarding Bootstrap
// This replaces the previous TourBootstrap with enhanced functionality

import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useOnboarding } from './EnhancedOnboardingProvider';

const EnhancedTourBootstrap: React.FC = () => {
  const { startFullTour, startQuickTour } = useOnboarding();
  const [location] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tourParam = urlParams.get('tour');
    
    // Handle different tour types from URL parameters
    switch (tourParam) {
      case '1':
      case 'full':
        setTimeout(() => startFullTour(), 500);
        break;
      case 'quick':
      case 'minimal':
        setTimeout(() => startQuickTour(), 500);
        break;
    }
  }, [location, startFullTour, startQuickTour]);

  return null;
};

export default EnhancedTourBootstrap;