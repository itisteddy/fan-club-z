/**
 * Modal Positioning Utilities
 * 
 * Ensures modals are positioned correctly above bottom navigation
 * with proper safe-area handling for mobile devices
 */

/**
 * Bottom navigation height constant
 */
export const BOTTOM_NAV_HEIGHT = 64; // 4rem = 64px

/**
 * Get modal positioning styles that respect bottom nav and safe areas
 */
export function getModalPositionStyles(options?: {
  maxHeight?: string;
  bottomOffset?: number;
}): React.CSSProperties {
  const { maxHeight, bottomOffset = BOTTOM_NAV_HEIGHT } = options || {};
  
  return {
    bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
    maxHeight: maxHeight || `calc(100vh - env(safe-area-inset-top, 0px) - ${bottomOffset}px - env(safe-area-inset-bottom, 0px))`,
  };
}

/**
 * Get modal container class names with proper z-index
 */
export function getModalContainerClasses(): string {
  return 'z-modal fixed inset-x-0 mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-xl focus:outline-none';
}

/**
 * Get modal overlay class names
 */
export function getModalOverlayClasses(): string {
  return 'fixed inset-0 bg-black/30 z-modal';
}

/**
 * Tailwind classes for modal positioning (for use with className)
 */
export const MODAL_POSITION_CLASSES = `bottom-[calc(64px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-env(safe-area-inset-top,0px)-64px-env(safe-area-inset-bottom,0px))]`;

/**
 * Safe area padding for modal content
 */
export const MODAL_SAFE_AREA_PADDING = 'pb-[env(safe-area-inset-bottom,0px)]';

