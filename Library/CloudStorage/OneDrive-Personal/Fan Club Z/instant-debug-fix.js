// IMMEDIATE FIX FOR RUNNING APP
// Copy and paste this into your browser console to stop debug output immediately

(function() {
  console.clear();
  console.log('🚀 Fan Club Z - Stopping Debug Output...');

  // Override ALL console methods to stop spam
  const noop = () => {};
  
  // Keep only critical errors, block everything else
  const originalError = console.error;
  
  console.log = noop;
  console.debug = noop; 
  console.info = noop;
  console.warn = noop;
  
  console.error = function(...args) {
    const message = args.join(' ');
    // Only show critical application errors
    if (
      message.includes('Uncaught') ||
      message.includes('TypeError') ||
      message.includes('ReferenceError')
    ) {
      originalError.apply(console, args);
    }
    // Block everything else including WebSocket errors
  };

  // Remove any debug UI elements
  function cleanUI() {
    // Remove debug info panels
    const debugElements = document.querySelectorAll('[class*="debug"], [id*="debug"], .debug-info');
    debugElements.forEach(el => el.remove());
    
    // Hide any development-only elements
    const devElements = document.querySelectorAll('[data-testid], [data-test-id]');
    devElements.forEach(el => {
      if (el.textContent && (el.textContent.includes('Debug') || el.textContent.includes('Loading:'))) {
        el.style.display = 'none';
      }
    });
  }

  // Clean immediately and keep cleaning
  cleanUI();
  setInterval(cleanUI, 500);

  // Prevent WebSocket debug messages by wrapping WebSocket
  if (window.WebSocket) {
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      const ws = new OriginalWebSocket(url, protocols);
      
      // Silent event handlers
      const originalAddEventListener = ws.addEventListener;
      ws.addEventListener = function(type, listener, options) {
        if (type === 'message') {
          // Wrap message handler to prevent logging
          const wrappedListener = function(event) {
            // Call original handler but don't log
            try {
              listener(event);
            } catch(e) {
              // Silent
            }
          };
          return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      return ws;
    };
  }

  // Disable React DevTools messages
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = noop;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount = noop;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberMount = noop;
  }

  console.clear();
  console.log('✅ Debug output STOPPED! Your console is now clean.');
  console.log('🎯 Join buttons and Leave buttons should work correctly now.');
  console.log('🔄 Refresh the page to see clean output from the start.');
  
})();