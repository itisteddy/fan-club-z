/**
 * Mobile Browser Compatibility Fixes
 * Handles polyfills and workarounds for mobile browsers
 */

// Extend Window interface for ethereum property
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Prevent wallet extension conflicts on mobile
export const preventWalletConflicts = () => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Prevent MetaMask and other wallet extensions from interfering on mobile
  if (typeof window.ethereum !== 'undefined') {
    try {
      // Store reference but don't let extensions redefine it
      const originalEthereum = window.ethereum;
      Object.defineProperty(window, 'ethereum', {
        value: originalEthereum,
        writable: false,
        configurable: false
      });
    } catch (error) {
      // If already defined, just log and continue
      console.log('Ethereum provider already configured');
    }
  }
};

// Fix viewport height on mobile browsers
export const fixMobileViewport = () => {
  if (typeof window === 'undefined') return;

  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
};

// Prevent zoom on input focus (iOS)
export const preventInputZoom = () => {
  if (typeof window === 'undefined') return;

  // Add viewport meta tag modification for iOS
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }
};

// Initialize all mobile compatibility fixes
export const initMobileCompatibility = () => {
  preventWalletConflicts();
  fixMobileViewport();
  preventInputZoom();

  // Add mobile-specific CSS classes
  if (typeof document !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    if (isIOS) {
      document.documentElement.classList.add('ios');
    }
    if (isAndroid) {
      document.documentElement.classList.add('android');
    }
  }
}; 