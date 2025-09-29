/**
 * Automated Smoke Tests
 * Quick validation of core functionality
 */

import { healthChecker } from './healthCheck';
import { performanceMonitor } from '../utils/performance';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  duration: number;
}

interface SmokeTestSuite {
  passed: boolean;
  total: number;
  failed: number;
  results: TestResult[];
  duration: number;
}

/**
 * Test basic DOM elements are present
 */
async function testDOMElements(): Promise<TestResult> {
  const start = performance.now();
  
  try {
    // Check for essential elements
    const checks = [
      { name: 'root element', selector: '#root' },
      { name: 'main content', selector: 'main, .main-content, [role="main"]' },
      { name: 'navigation', selector: 'nav, [role="navigation"]' },
    ];
    
    const missing = checks.filter(check => !document.querySelector(check.selector));
    
    if (missing.length === 0) {
      return {
        test: 'DOM Structure',
        passed: true,
        message: 'Essential DOM elements present',
        duration: performance.now() - start,
      };
    } else {
      return {
        test: 'DOM Structure',
        passed: false,
        message: `Missing elements: ${missing.map(m => m.name).join(', ')}`,
        duration: performance.now() - start,
      };
    }
  } catch (error) {
    return {
      test: 'DOM Structure',
      passed: false,
      message: `DOM test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: performance.now() - start,
    };
  }
}

/**
 * Test React application is mounted
 */
async function testReactMount(): Promise<TestResult> {
  const start = performance.now();
  
  try {
    // Check for React-specific patterns
    const reactPatterns = [
      () => document.querySelector('[data-reactroot]') !== null,
      () => document.querySelector('div[id="root"]')?.children.length > 0,
      () => document.querySelector('.react-app, [data-testid]') !== null,
      () => window.React !== undefined,
      () => (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined,
    ];
    
    const reactDetected = reactPatterns.some(pattern => {
      try {
        return pattern();
      } catch {
        return false;
      }
    });
    
    if (reactDetected) {
      return {
        test: 'React Application',
        passed: true,
        message: 'React application successfully mounted',
        duration: performance.now() - start,
      };
    } else {
      return {
        test: 'React Application',
        passed: false,
        message: 'React application not detected',
        duration: performance.now() - start,
      };
    }
  } catch (error) {
    return {
      test: 'React Application',
      passed: false,
      message: `React test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: performance.now() - start,
    };
  }
}

/**
 * Test routing is working
 */
async function testRouting(): Promise<TestResult> {
  const start = performance.now();
  
  try {
    const currentPath = window.location.pathname;
    const expectedRoutes = ['/', '/discover', '/predictions', '/profile', '/wallet'];
    
    // Check if we're on a known route or a dynamic route
    const isKnownRoute = expectedRoutes.includes(currentPath) || 
                        /^\/prediction\/[a-f0-9-]+$/.test(currentPath) ||
                        /^\/profile\/[a-f0-9-]+$/.test(currentPath);
    
    // Test history API is available
    const hasHistory = typeof window.history !== 'undefined' && 
                      typeof window.history.pushState === 'function';
    
    if (isKnownRoute && hasHistory) {
      return {
        test: 'Routing System',
        passed: true,
        message: `Routing working on ${currentPath}`,
        duration: performance.now() - start,
      };
    } else if (!hasHistory) {
      return {
        test: 'Routing System',
        passed: false,
        message: 'History API not available',
        duration: performance.now() - start,
      };
    } else {
      return {
        test: 'Routing System',
        passed: false,
        message: `Unknown route: ${currentPath}`,
        duration: performance.now() - start,
      };
    }
  } catch (error) {
    return {
      test: 'Routing System',
      passed: false,
      message: `Routing test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: performance.now() - start,
    };
  }
}

/**
 * Test local storage functionality
 */
async function testStorage(): Promise<TestResult> {
  const start = performance.now();
  
  try {
    const testKey = 'smoke_test_storage';
    const testValue = JSON.stringify({ test: true, timestamp: Date.now() });
    
    // Test localStorage
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    
    if (retrieved === testValue) {
      localStorage.removeItem(testKey);
      
      // Test sessionStorage
      sessionStorage.setItem(testKey, testValue);
      const sessionRetrieved = sessionStorage.getItem(testKey);
      
      if (sessionRetrieved === testValue) {
        sessionStorage.removeItem(testKey);
        
        return {
          test: 'Storage Systems',
          passed: true,
          message: 'localStorage and sessionStorage working',
          duration: performance.now() - start,
        };
      } else {
        return {
          test: 'Storage Systems',
          passed: false,
          message: 'sessionStorage not working',
          duration: performance.now() - start,
        };
      }
    } else {
      return {
        test: 'Storage Systems',
        passed: false,
        message: 'localStorage not working',
        duration: performance.now() - start,
      };
    }
  } catch (error) {
    return {
      test: 'Storage Systems',
      passed: false,
      message: `Storage test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: performance.now() - start,
    };
  }
}

/**
 * Test console for critical errors
 */
async function testConsoleErrors(): Promise<TestResult> {
  const start = performance.now();
  
  // This is a basic implementation - in a real scenario you'd want to
  // capture console.error calls during a specific test period
  
  try {
    // Check for common error indicators
    const hasReactErrors = document.querySelector('.react-error-boundary') !== null;
    const hasJSErrors = (window as any).__REACT_ERROR_COUNT__ > 0;
    
    if (hasReactErrors || hasJSErrors) {
      return {
        test: 'Console Errors',
        passed: false,
        message: 'Critical errors detected in console',
        duration: performance.now() - start,
      };
    } else {
      return {
        test: 'Console Errors',
        passed: true,
        message: 'No critical console errors detected',
        duration: performance.now() - start,
      };
    }
  } catch (error) {
    return {
      test: 'Console Errors',
      passed: false,
      message: `Error checking console: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: performance.now() - start,
    };
  }
}

/**
 * Run all smoke tests
 */
export async function runSmokeTests(): Promise<SmokeTestSuite> {
  const suiteStart = performance.now();
  
  console.log('🔥 Starting automated smoke tests...');
  
  const tests = [
    testDOMElements(),
    testReactMount(),
    testRouting(),
    testStorage(),
    testConsoleErrors(),
  ];
  
  const results = await Promise.all(tests);
  const failed = results.filter(r => !r.passed).length;
  
  const suite: SmokeTestSuite = {
    passed: failed === 0,
    total: results.length,
    failed,
    results,
    duration: performance.now() - suiteStart,
  };
  
  // Log results
  console.log('📊 Smoke Test Results:');
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`  ${icon} ${result.test}: ${result.message} (${result.duration.toFixed(2)}ms)`);
  });
  
  const status = suite.passed ? 'PASSED' : 'FAILED';
  console.log(`\n🎯 Smoke Tests ${status}: ${suite.total - suite.failed}/${suite.total} tests passed`);
  
  return suite;
}

/**
 * Run comprehensive test suite (smoke + health checks)
 */
export async function runFullTestSuite(): Promise<{
  smokeTests: SmokeTestSuite;
  healthChecks: any;
  passed: boolean;
}> {
  console.log('🧪 Running full test suite...');
  
  const start = performance.now();
  
  // Run smoke tests
  const smokeTests = await runSmokeTests();
  
  // Run health checks
  const healthChecks = await healthChecker.runAllChecks();
  
  // Overall pass/fail
  const passed = smokeTests.passed && healthChecks.failed === 0;
  
  const duration = performance.now() - start;
  console.log(`\n⏱️ Full test suite completed in ${duration.toFixed(2)}ms`);
  console.log(`🎯 Overall result: ${passed ? 'PASSED' : 'FAILED'}`);
  
  if (!passed) {
    console.log('❌ Issues detected:');
    if (!smokeTests.passed) {
      smokeTests.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.test}: ${r.message}`);
      });
    }
    if (healthChecks.failed > 0) {
      healthChecks.results.filter((r: any) => r.status === 'fail').forEach((r: any) => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }
  }
  
  return { smokeTests, healthChecks, passed };
}

// Auto-run smoke tests in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => runSmokeTests(), 1000);
    });
  } else {
    // DOM already loaded
    setTimeout(() => runSmokeTests(), 1000);
  }
  
  // Expose to window for manual testing
  (window as any).runSmokeTests = runSmokeTests;
  (window as any).runFullTestSuite = runFullTestSuite;
}

export default { runSmokeTests, runFullTestSuite };
