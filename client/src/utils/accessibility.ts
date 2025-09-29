/**
 * Accessibility utilities for FCZ application
 * Implements WCAG 2.1 AA standards for focus management, keyboard navigation, and ARIA
 */

export type FocusableElement = HTMLElement | HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Focus trap utility for modals and dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private focusableElements: FocusableElement[];
  private firstFocusableElement: FocusableElement | null = null;
  private lastFocusableElement: FocusableElement | null = null;
  private previousActiveElement: Element | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.focusableElements = [];
    this.updateFocusableElements();
  }

  private updateFocusableElements() {
    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');

    this.focusableElements = Array.from(
      this.element.querySelectorAll(focusableSelector)
    ) as FocusableElement[];

    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  activate() {
    this.previousActiveElement = document.activeElement;
    this.updateFocusableElements();
    
    // Focus first element with a small delay to ensure modal is rendered
    setTimeout(() => {
      if (this.firstFocusableElement) {
        this.firstFocusableElement.focus();
      }
    }, 50);

    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Restore focus to previous element
    if (this.previousActiveElement && 'focus' in this.previousActiveElement) {
      (this.previousActiveElement as HTMLElement).focus();
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    this.updateFocusableElements();

    if (this.focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    if (this.focusableElements.length === 1) {
      event.preventDefault();
      this.firstFocusableElement?.focus();
      return;
    }

    if (event.shiftKey) {
      // Shift + Tab (moving backwards)
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {
      // Tab (moving forwards)
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };
}

/**
 * Keyboard navigation utilities
 */
export const KeyboardNavigation = {
  /**
   * Handle arrow key navigation in lists
   */
  handleArrowKeys: (
    event: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onIndexChange: (newIndex: number) => void,
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ) => {
    const isVertical = orientation === 'vertical';
    const upKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const downKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    switch (event.key) {
      case upKey:
        event.preventDefault();
        onIndexChange(currentIndex > 0 ? currentIndex - 1 : totalItems - 1);
        break;
      case downKey:
        event.preventDefault();
        onIndexChange(currentIndex < totalItems - 1 ? currentIndex + 1 : 0);
        break;
      case 'Home':
        event.preventDefault();
        onIndexChange(0);
        break;
      case 'End':
        event.preventDefault();
        onIndexChange(totalItems - 1);
        break;
    }
  },

  /**
   * Handle escape key for closing modals/dropdowns
   */
  handleEscape: (event: KeyboardEvent, onEscape: () => void) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape();
    }
  },

  /**
   * Handle Enter and Space for button-like elements
   */
  handleActivation: (event: KeyboardEvent, onActivate: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  }
};

/**
 * ARIA utilities for screen readers
 */
export const AriaUtils = {
  /**
   * Generate unique IDs for ARIA relationships
   */
  generateId: (prefix: string = 'fcz'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create ARIA live region announcements
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement is made
    setTimeout(() => {
      if (announcement.parentNode) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  },

  /**
   * Set expanded state for collapsible elements
   */
  setExpanded: (element: HTMLElement, expanded: boolean) => {
    element.setAttribute('aria-expanded', expanded.toString());
  },

  /**
   * Set selected state for selectable elements
   */
  setSelected: (element: HTMLElement, selected: boolean) => {
    element.setAttribute('aria-selected', selected.toString());
  },

  /**
   * Set pressed state for toggle buttons
   */
  setPressed: (element: HTMLElement, pressed: boolean) => {
    element.setAttribute('aria-pressed', pressed.toString());
  }
};

/**
 * Focus restoration utility for SPAs
 */
export class FocusManager {
  private static focusStack: Element[] = [];

  static saveFocus() {
    const activeElement = document.activeElement;
    if (activeElement) {
      this.focusStack.push(activeElement);
    }
  }

  static restoreFocus() {
    const previousFocus = this.focusStack.pop();
    if (previousFocus && 'focus' in previousFocus) {
      setTimeout(() => {
        (previousFocus as HTMLElement).focus();
      }, 50);
    }
  }

  static clearStack() {
    this.focusStack = [];
  }
}

/**
 * Skip link utility for keyboard navigation
 */
export const createSkipLink = (targetId: string, text: string = 'Skip to main content') => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md';
  
  skipLink.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return skipLink;
};

/**
 * High contrast mode detection
 */
export const isHighContrastMode = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Reduced motion detection
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Screen reader detection (heuristic)
 */
export const isScreenReaderActive = (): boolean => {
  // Check for common screen reader indicators
  return !!(
    (window as any).speechSynthesis ||
    (window as any).navigator?.userAgent?.includes('NVDA') ||
    (window as any).navigator?.userAgent?.includes('JAWS') ||
    document.querySelector('[role="region"][aria-live]')
  );
};

export default {
  FocusTrap,
  KeyboardNavigation,
  AriaUtils,
  FocusManager,
  createSkipLink,
  isHighContrastMode,
  prefersReducedMotion,
  isScreenReaderActive
};
