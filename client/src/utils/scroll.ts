// Enhanced scroll management utility for Fan Club Z with navigation context
// Provides sophisticated scroll preservation across route changes

interface ScrollContext {
  scrollY: number;
  timestamp: number;
  route: string;
}

class ScrollManager {
  private static instance: ScrollManager;
  private scrollPositions: Map<string, ScrollContext> = new Map();
  private currentRoute: string = '';
  private scrollTimeout: number | null = null;
  private isNavigating: boolean = false;
  private restoreTimeout: number | null = null;

  private constructor() {
    // Initialize with current location
    if (typeof window !== 'undefined') {
      this.currentRoute = window.location.pathname;
      this.setupNavigationListeners();
    }
  }

  static getInstance(): ScrollManager {
    if (!ScrollManager.instance) {
      ScrollManager.instance = new ScrollManager();
    }
    return ScrollManager.instance;
  }

  private setupNavigationListeners(): void {
    // Listen for route changes to save/restore scroll positions
    let lastUrl = window.location.pathname;
    
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.pathname;
      if (currentUrl !== lastUrl) {
        console.log(`🔄 Route change detected: ${lastUrl} → ${currentUrl}`);
        this.handleRouteChange(lastUrl, currentUrl);
        lastUrl = currentUrl;
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true
    });

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', () => {
      console.log('⬅️ Browser navigation detected');
      this.isNavigating = true;
      setTimeout(() => {
        this.restoreScrollPosition(window.location.pathname);
        this.isNavigating = false;
      }, 100);
    });

    // Save scroll position before page unload
    window.addEventListener('beforeunload', () => {
      this.saveCurrentScrollPosition();
    });
  }

  private handleRouteChange(fromRoute: string, toRoute: string): void {
    // Save scroll position for the route we're leaving
    if (fromRoute !== toRoute) {
      this.saveScrollPosition(fromRoute);
      this.currentRoute = toRoute;
      
      // Don't restore immediately, let the new page render first
      this.scheduleScrollRestore(toRoute);
    }
  }

  private scheduleScrollRestore(route: string): void {
    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
    }

    // Wait for page to render, then restore scroll
    this.restoreTimeout = window.setTimeout(() => {
      if (!this.isNavigating) {
        this.restoreScrollPosition(route);
      }
    }, 150);
  }

  saveScrollPosition(route?: string): void {
    const routeKey = route || this.currentRoute;
    const scrollY = this.getCurrentScrollPosition();

    if (scrollY > 50) { // Only save meaningful scroll positions
      this.scrollPositions.set(routeKey, {
        scrollY,
        timestamp: Date.now(),
        route: routeKey
      });
      console.log(`💾 Saved scroll position for ${routeKey}: ${scrollY}px`);
    }
  }

  saveCurrentScrollPosition(): void {
    this.saveScrollPosition(this.currentRoute);
  }

  restoreScrollPosition(route: string): boolean {
    const context = this.scrollPositions.get(route);
    
    if (!context) {
      console.log(`📍 No saved scroll position for ${route}`);
      return false;
    }

    // Check if the saved position is still valid (within 10 minutes)
    const isRecent = Date.now() - context.timestamp < 10 * 60 * 1000;
    if (!isRecent) {
      console.log(`⏰ Scroll position for ${route} is too old, ignoring`);
      this.scrollPositions.delete(route);
      return false;
    }

    console.log(`🔄 Restoring scroll position for ${route}: ${context.scrollY}px`);
    
    // Use smooth scrolling with fallback
    this.scrollToPosition(context.scrollY, 'smooth');
    return true;
  }

  private getCurrentScrollPosition(): number {
    return window.pageYOffset || 
           document.documentElement.scrollTop || 
           document.body.scrollTop || 
           0;
  }

  private scrollToPosition(scrollY: number, behavior: 'smooth' | 'instant' = 'smooth'): void {
    try {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollY,
          left: 0,
          behavior
        });

        // Fallback for browsers that don't support smooth scrolling
        if (behavior === 'smooth') {
          // Verify scroll actually happened
          setTimeout(() => {
            const currentPos = this.getCurrentScrollPosition();
            if (Math.abs(currentPos - scrollY) > 100) {
              // If smooth scroll failed, use instant
              window.scrollTo(0, scrollY);
            }
          }, 300);
        }
      });
    } catch (error) {
      // Fallback for older browsers
      console.warn('Scroll API failed, using fallback:', error);
      window.scrollTo(0, scrollY);
      document.documentElement.scrollTop = scrollY;
      document.body.scrollTop = scrollY;
    }
  }

  // Enhanced scroll to top with debouncing
  scrollToTop(options: { behavior?: 'smooth' | 'instant'; delay?: number } = {}): void {
    const { behavior = 'smooth', delay = 0 } = options;
    
    // Clear any existing timeout to prevent multiple rapid calls
    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = window.setTimeout(() => {
      this.scrollToPosition(0, behavior);
      this.scrollTimeout = null;
    }, delay);
  }

  scrollToElement(elementId: string, options: { behavior?: 'smooth' | 'instant'; offset?: number } = {}): void {
    const { behavior = 'smooth', offset = 0 } = options;
    
    // Clear any existing timeout
    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = window.setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        const elementPosition = element.offsetTop - offset;
        this.scrollToPosition(elementPosition, behavior);
      }
      this.scrollTimeout = null;
    }, 50);
  }

  // Clear old scroll positions to prevent memory leaks
  clearOldPositions(): void {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    for (const [route, context] of this.scrollPositions.entries()) {
      if (now - context.timestamp > tenMinutes) {
        this.scrollPositions.delete(route);
        console.log(`🗑️ Cleared old scroll position for ${route}`);
      }
    }
  }

  // Mark current navigation as intentional (prevent auto-restore)
  markNavigationAsIntentional(): void {
    this.isNavigating = true;
    setTimeout(() => {
      this.isNavigating = false;
    }, 500);
  }

  // Get debug info
  getDebugInfo(): object {
    return {
      currentRoute: this.currentRoute,
      savedPositions: Array.from(this.scrollPositions.entries()).map(([route, context]) => ({
        route,
        scrollY: context.scrollY,
        age: Date.now() - context.timestamp
      })),
      isNavigating: this.isNavigating
    };
  }

  destroy(): void {
    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout);
    }
    if (this.restoreTimeout) {
      window.clearTimeout(this.restoreTimeout);
    }
    this.scrollPositions.clear();
  }
}

// Create singleton instance
const scrollManager = ScrollManager.getInstance();

// Export convenience functions
export const scrollToTop = (options?: { behavior?: 'smooth' | 'instant'; delay?: number }) => {
  scrollManager.scrollToTop(options);
};

export const scrollToElement = (elementId: string, options?: { behavior?: 'smooth' | 'instant'; offset?: number }) => {
  scrollManager.scrollToElement(elementId, options);
};

export const saveScrollPosition = (route?: string) => {
  scrollManager.saveScrollPosition(route);
};

export const restoreScrollPosition = (route: string) => {
  return scrollManager.restoreScrollPosition(route);
};

export const markNavigationAsIntentional = () => {
  scrollManager.markNavigationAsIntentional();
};

export const clearScrollTimeout = () => {
  // Legacy function for backward compatibility
  console.warn('clearScrollTimeout is deprecated, scroll management is now automatic');
};

// Hook for React components
export const useScrollPreservation = () => {
  return {
    saveScroll: saveScrollPosition,
    restoreScroll: restoreScrollPosition,
    markIntentionalNavigation: markNavigationAsIntentional,
    debugInfo: () => scrollManager.getDebugInfo()
  };
};

// Clean up old positions periodically
setInterval(() => {
  scrollManager.clearOldPositions();
}, 5 * 60 * 1000); // Every 5 minutes

export default scrollManager;