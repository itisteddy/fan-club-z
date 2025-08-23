import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useScrollStore } from '../store/scrollStore';

interface ScrollPreservationOptions {
  saveOnUnmount?: boolean;
  restoreOnMount?: boolean;
  preserveFor?: number; // minutes
  threshold?: number; // pixels
}

export const useScrollPreservation = (
  containerRef?: React.RefObject<HTMLElement>,
  options: ScrollPreservationOptions = {}
) => {
  const [location] = useLocation();
  const { saveScrollPosition, getScrollPosition } = useScrollStore();
  const lastLocationRef = useRef<string>('');
  
  const {
    saveOnUnmount = true,
    restoreOnMount = true,
    preserveFor = 10, // 10 minutes default
    threshold = 50 // minimum scroll position to save
  } = options;

  // Get scroll container
  const getScrollContainer = useCallback((): HTMLElement => {
    if (containerRef?.current) {
      return containerRef.current;
    }
    // Default to main content area or window
    const mainContent = document.querySelector('[data-scroll-container]') as HTMLElement;
    return mainContent || document.documentElement;
  }, [containerRef]);

  // Save current scroll position
  const saveCurrentScroll = useCallback(() => {
    const container = getScrollContainer();
    const scrollY = container === document.documentElement 
      ? window.pageYOffset || document.documentElement.scrollTop
      : container.scrollTop;
    
    if (scrollY > threshold) {
      console.log(`💾 Saving scroll position for ${location}: ${scrollY}px`);
      saveScrollPosition(location, scrollY);
    }
  }, [location, threshold, saveScrollPosition, getScrollContainer]);

  // Restore scroll position for current location
  const restoreScroll = useCallback(() => {
    const container = getScrollContainer();
    const savedPosition = getScrollPosition(location);
    
    if (savedPosition !== null && savedPosition > 0) {
      console.log(`🔄 Restoring scroll position for ${location}: ${savedPosition}px`);
      
      // Use a short delay to ensure content is rendered
      setTimeout(() => {
        if (container === document.documentElement) {
          window.scrollTo({ top: savedPosition, behavior: 'smooth' });
        } else {
          container.scrollTo({ top: savedPosition, behavior: 'smooth' });
        }
      }, 100);
      
      return true;
    }
    
    return false;
  }, [location, getScrollPosition, getScrollContainer]);

  // Programmatically save scroll position (for navigation events)
  const saveScroll = useCallback((customLocation?: string) => {
    const container = getScrollContainer();
    const scrollY = container === document.documentElement 
      ? window.pageYOffset || document.documentElement.scrollTop
      : container.scrollTop;
    
    const locationToSave = customLocation || location;
    if (scrollY > threshold) {
      console.log(`💾 Manually saving scroll for ${locationToSave}: ${scrollY}px`);
      saveScrollPosition(locationToSave, scrollY);
    }
  }, [location, threshold, saveScrollPosition, getScrollContainer]);

  // Effect for mount/unmount behavior
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Restore scroll on mount
    if (restoreOnMount) {
      timeoutId = setTimeout(() => {
        restoreScroll();
      }, 50);
    }

    // Save scroll on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (saveOnUnmount) {
        saveCurrentScroll();
      }
    };
  }, [restoreOnMount, saveOnUnmount, restoreScroll, saveCurrentScroll]);

  // Effect for location changes
  useEffect(() => {
    // Save scroll for previous location before navigating away
    if (lastLocationRef.current && lastLocationRef.current !== location) {
      console.log(`🔄 Location changed from ${lastLocationRef.current} to ${location}`);
      // Don't save here, let the previous component handle it via unmount
    }
    
    lastLocationRef.current = location;
  }, [location]);

  return {
    saveScroll,
    restoreScroll,
    saveCurrentScroll
  };
};

export default useScrollPreservation;
