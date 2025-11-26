import { t } from '@/lib/lexicon';

/**
 * Navigation utilities for consistent spacing and bottom navigation handling
 */

/**
 * CSS class that provides proper bottom padding to clear the bottom navigation
 * Accounts for safe area insets on mobile devices
 */
export const BOTTOM_NAV_CLEARANCE = 'pb-[calc(5rem+env(safe-area-inset-bottom))]';

/**
 * CSS class for full height containers that need to account for bottom navigation
 */
export const FULL_HEIGHT_WITH_NAV = 'min-h-[calc(100vh-5rem-env(safe-area-inset-bottom))]';

/**
 * Get the bottom navigation height in pixels (for JS calculations)
 * @param includesSafeArea Whether to include safe area inset (default: true)
 * @returns Height in pixels
 */
export const getBottomNavHeight = (includesSafeArea = true): string => {
  const baseHeight = 80; // 5rem = 80px
  if (includesSafeArea) {
    return `calc(${baseHeight}px + env(safe-area-inset-bottom))`;
  }
  return `${baseHeight}px`;
};

/**
 * CSS-in-JS style object for bottom navigation clearance
 */
export const bottomNavClearanceStyle = {
  paddingBottom: getBottomNavHeight()
};

/**
 * Scroll to top utility with smooth behavior
 */
export const scrollToTop = (options: ScrollToOptions = { behavior: 'smooth' }) => {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, ...options });
  }
};

/**
 * Check if an element is obscured by the bottom navigation
 * @param element The element to check
 * @returns True if the element is likely obscured
 */
export const isObscuredByBottomNav = (element: Element): boolean => {
  if (typeof window === 'undefined') return false;
  
  const rect = element.getBoundingClientRect();
  const navHeight = 80; // Base height without safe area
  const windowHeight = window.innerHeight;
  
  // Check if element bottom is in the bottom navigation area
  return rect.bottom > (windowHeight - navHeight);
};

/**
 * Navigation tab configuration type
 */
export interface NavigationTabConfig {
  id: string;
  label: string;
  path: string;
  badge?: number;
  requiresAuth?: boolean;
}

/**
 * Default navigation configuration
 */
export const DEFAULT_NAV_TABS: NavigationTabConfig[] = [
  { id: 'discover', label: 'Discover', path: '/', requiresAuth: false },
  { id: 'bets', label: t('myBets'), path: '/bets', requiresAuth: true },
  { id: 'leaderboard', label: 'Rankings', path: '/leaderboard', requiresAuth: false },
  { id: 'wallet', label: 'Wallet', path: '/wallet', requiresAuth: true },
  { id: 'profile', label: 'Profile', path: '/profile', requiresAuth: true },
];
