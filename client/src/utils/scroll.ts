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
  private navigationHistory: string[] = []; // Track navigation history to detect back navigation
  private isBackNavigation: boolean = false; // Flag to track if current navigation is back

  private constructor() {
    // Initialize with current location
    if (typeof window !== 'undefined') {
      this.currentRoute = window.location.pathname;
      // Initialize navigation history with current route
      this.navigationHistory = [this.currentRoute];
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
    // Note: React Router navigation is handled by App.tsx useEffect
    // This scroll manager focuses on browser back/forward (popstate) events

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', () => {
      // Browser navigation logging removed - excessive logging issue
      this.isNavigating = true;
      this.isBackNavigation = true; // Browser back/forward is always back navigation
      
      // Update navigation history for browser navigation
      const currentPath = window.location.pathname;
      if (this.navigationHistory.length > 0) {
        // Remove last entry if it matches (going back)
        if (this.navigationHistory[this.navigationHistory.length - 1] === this.currentRoute) {
          this.navigationHistory.pop();
        }
      }
      
      setTimeout(() => {
        this.restoreScrollPosition(currentPath);
        this.currentRoute = currentPath;
        this.isNavigating = false;
        this.isBackNavigation = false;
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
      
      // Detect if this is a back navigation by checking if toRoute is in our history
      const isBackNav = this.navigationHistory.length > 1 && 
                        this.navigationHistory[this.navigationHistory.length - 2] === toRoute;
      
      // Update navigation history
      if (!isBackNav) {
        // Forward navigation - add to history
        this.navigationHistory.push(toRoute);
        // Keep history limited to last 10 routes
        if (this.navigationHistory.length > 10) {
          this.navigationHistory.shift();
        }
      } else {
        // Back navigation - remove last entry from history
        this.navigationHistory.pop();
      }
      
      this.currentRoute = toRoute;
      this.isBackNavigation = isBackNav;
      
      if (isBackNav) {
        // Back navigation - restore scroll position
        this.scheduleScrollRestore(toRoute);
      } else {
        // Forward navigation - always scroll to top
        this.scrollToTop({ behavior: 'instant', delay: 50 });
      }
    }
  }

  private scheduleScrollRestore(route: string): void {
    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
    }

    // Wait for page to render, then restore scroll (only if back navigation)
    this.restoreTimeout = window.setTimeout(() => {
      if (!this.isNavigating && this.isBackNavigation) {
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
      // Scroll position logging removed - excessive logging issue
    }
  }

  saveCurrentScrollPosition(): void {
    this.saveScrollPosition(this.currentRoute);
  }

  restoreScrollPosition(route: string): boolean {
    const context = this.scrollPositions.get(route);
    
    if (!context) {
      // Scroll position logging removed - excessive logging issue
      return false;
    }

    // Check if the saved position is still valid (within 10 minutes)
    const isRecent = Date.now() - context.timestamp < 10 * 60 * 1000;
    if (!isRecent) {
      // Scroll position logging removed - excessive logging issue
      this.scrollPositions.delete(route);
      return false;
    }

    // Scroll position logging removed - excessive logging issue
    
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
    // Force scroll on all possible scroll containers for cross-browser/mobile compatibility
    const forceScroll = () => {
      // Try all possible scroll containers
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = scrollY;
      }
      document.documentElement.scrollTop = scrollY;
      document.body.scrollTop = scrollY;
      
      // Also try window.scrollTo for completeness
      try {
        window.scrollTo({
          top: scrollY,
          left: 0,
          behavior: behavior === 'instant' ? 'instant' : 'smooth'
        });
      } catch {
        window.scrollTo(0, scrollY);
      }
    };

    // Execute immediately for instant behavior
    if (behavior === 'instant') {
      forceScroll();
      // Double-check with RAF for mobile Safari
      requestAnimationFrame(() => {
        forceScroll();
      });
      return;
    }

    // For smooth behavior, use scrollTo API
    try {
      window.scrollTo({
        top: scrollY,
        left: 0,
        behavior: 'smooth'
      });
      
      // Verify scroll actually happened
      setTimeout(() => {
        const currentPos = this.getCurrentScrollPosition();
        if (Math.abs(currentPos - scrollY) > 100) {
          forceScroll();
        }
      }, 300);
    } catch {
      forceScroll();
    }
  }

  // Enhanced scroll to top with debouncing
  scrollToTop(options: { behavior?: 'smooth' | 'instant'; delay?: number } = {}): void {
    const { behavior = 'smooth', delay = 0 } = options;
    
    // Clear any existing timeout to prevent multiple rapid calls
    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout);
    }
    
    // For instant behavior, execute immediately AND with delay to ensure it takes effect
    if (behavior === 'instant') {
      // Immediate scroll
      this.scrollToPosition(0, 'instant');
      
      // Also schedule with delay to catch late-rendering content
      if (delay > 0) {
        this.scrollTimeout = window.setTimeout(() => {
          this.scrollToPosition(0, 'instant');
          this.scrollTimeout = null;
        }, delay);
      }
      
      // Extra safety: scroll again after a longer delay for slow-loading pages
      window.setTimeout(() => {
        this.scrollToPosition(0, 'instant');
      }, 100);
      
      return;
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
        // Scroll cleanup logging removed - excessive logging issue
      }
    }
  }

  // Mark current navigation as intentional (prevent auto-restore, scroll to top)
  markNavigationAsIntentional(): void {
    this.isNavigating = true;
    this.isBackNavigation = false; // Intentional navigation is forward navigation
    setTimeout(() => {
      this.isNavigating = false;
    }, 500);
  }
  
  // Mark navigation as back navigation (allow scroll restore)
  markAsBackNavigation(): void {
    this.isBackNavigation = true;
  }
  
  // Handle React Router navigation change
  handleRouterNavigation(fromRoute: string, toRoute: string): void {
    // Save scroll position for the route we're leaving
    this.saveScrollPosition(fromRoute);
    
    // Detect if this is a back navigation by checking if toRoute is in our history
    const isBackNav = this.navigationHistory.length > 1 && 
                      this.navigationHistory[this.navigationHistory.length - 2] === toRoute;
    
    // Update navigation history
    if (!isBackNav) {
      // Forward navigation - add to history
      this.navigationHistory.push(toRoute);
      // Keep history limited to last 10 routes
      if (this.navigationHistory.length > 10) {
        this.navigationHistory.shift();
      }
    } else {
      // Back navigation - remove last entry from history
      this.navigationHistory.pop();
    }
    
    this.currentRoute = toRoute;
    this.isBackNavigation = isBackNav;
    
    if (isBackNav) {
      // Back navigation - restore scroll position
      setTimeout(() => {
        this.restoreScrollPosition(toRoute);
      }, 150);
    } else {
      // Forward navigation - AGGRESSIVELY scroll to top
      // Immediately scroll
      this.scrollToPosition(0, 'instant');
      // Also schedule with delay for late-rendering content
      this.scrollToTop({ behavior: 'instant', delay: 50 });
    }
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

export const handleRouterNavigation = (fromRoute: string, toRoute: string) => {
  scrollManager.handleRouterNavigation(fromRoute, toRoute);
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