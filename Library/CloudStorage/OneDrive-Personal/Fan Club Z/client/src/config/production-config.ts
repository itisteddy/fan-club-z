// production-config.ts
// Production configuration to clean up debug output

export const ProductionConfig = {
  // Environment check
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Debug Configuration
  debug: {
    enableConsole: process.env.NODE_ENV !== 'production',
    enableDevTools: process.env.NODE_ENV !== 'production',
  },
};

// Initialize production configuration
export const initProductionConfig = () => {
  // Always clean console output for better UX
  if (typeof window !== 'undefined') {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    // Override console methods to reduce debug spam
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    
    // Filter warnings
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      // Suppress common development warnings and debug output
      if (
        message.includes('WebSocket') ||
        message.includes('DevTools') ||
        message.includes('[HMR]') ||
        message.includes('React DevTools') ||
        message.includes('Download the React DevTools') ||
        message.includes('Rendering category') ||
        message.includes('MessageEvent') ||
        message.includes('Loading:') ||
        message.includes('🚀') ||
        message.includes('📊') ||
        message.includes('✅') ||
        message.includes('❌') ||
        message.includes('🔍') ||
        message.includes('👤') ||
        message.includes('🔄') ||
        message.includes('🤝') ||
        message.includes('👋') ||
        message.includes('🏁') ||
        message.includes('💆') ||
        message.includes('🏷️') ||
        message.includes('👥')
      ) {
        return; // Silent
      }
      // Keep important warnings
      originalConsole.warn(...args);
    };
    
    // Filter errors but keep critical ones
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Suppress non-critical errors and debug output
      if (
        message.includes('WebSocket connection') ||
        message.includes('Failed to fetch') ||
        message.includes('Network request failed') ||
        message.includes('ChunkLoadError') ||
        message.includes('[HMR]') ||
        message.includes('DevTools') ||
        message.includes('Rendering category') ||
        message.includes('MessageEvent') ||
        message.includes('🚀') ||
        message.includes('📊') ||
        message.includes('✅') ||
        message.includes('❌') ||
        message.includes('🔍') ||
        message.includes('👤') ||
        message.includes('🔄') ||
        message.includes('🤝') ||
        message.includes('👋') ||
        message.includes('🏁') ||
        message.includes('💆') ||
        message.includes('🏷️') ||
        message.includes('👥')
      ) {
        return; // Silent
      }
      
      // Keep critical errors visible
      originalConsole.error(...args);
    };

    // Clean up debug elements periodically
    const cleanDebugElements = () => {
      // Remove any debug panels or elements
      const debugSelectors = [
        '[data-test-id]',
        '[data-testid]',
        '.debug-panel',
        '.dev-tools',
        '.console-panel',
        '#debug-info',
        '[class*="debug"]'
      ];
      
      debugSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Only remove if it contains debug-related text
          if (element.textContent?.includes('Debug') || 
              element.textContent?.includes('Loading:') ||
              element.textContent?.includes('Rendering category')) {
            element.remove();
          }
        });
      });
    };

    // Clean immediately and periodically
    setTimeout(cleanDebugElements, 1000);
    setInterval(cleanDebugElements, 10000); // Every 10 seconds

    // Remove React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      try {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = null;
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount = null;
      } catch (e) {
        // Silent
      }
    }

    // Clear console immediately
    console.clear();
  }
};

// Export default configuration
export default ProductionConfig;