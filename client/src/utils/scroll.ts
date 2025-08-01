// Scroll management utility for Fan Club Z
// Prevents excessive scroll calls and provides smooth scrolling

let scrollTimeout: number | null = null;

export const scrollToTop = (options: { behavior?: 'smooth' | 'instant'; delay?: number } = {}) => {
  const { behavior = 'smooth', delay = 0 } = options;
  
  // Clear any existing timeout to prevent multiple rapid calls
  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout);
  }
  
  // Use timeout to debounce scroll calls
  scrollTimeout = window.setTimeout(() => {
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior
      });
    } catch (error) {
      // Fallback for older browsers
      window.scrollTo(0, 0);
    }
    scrollTimeout = null;
  }, delay);
};

export const scrollToElement = (elementId: string, options: { behavior?: 'smooth' | 'instant'; offset?: number } = {}) => {
  const { behavior = 'smooth', offset = 0 } = options;
  
  // Clear any existing timeout
  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = window.setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.offsetTop - offset;
      try {
        window.scrollTo({
          top: elementPosition,
          left: 0,
          behavior
        });
      } catch (error) {
        // Fallback for older browsers
        window.scrollTo(0, elementPosition);
      }
    }
    scrollTimeout = null;
  }, 50);
};

export const clearScrollTimeout = () => {
  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout);
    scrollTimeout = null;
  }
};
