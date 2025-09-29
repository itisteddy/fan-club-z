/**
 * Health Check Utilities
 * Automated checks for critical application functionality
 */

interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration: number;
  timestamp: number;
}

interface HealthCheckSuite {
  suite: string;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  duration: number;
  results: HealthCheckResult[];
}

class HealthChecker {
  private results: HealthCheckResult[] = [];

  /**
   * Check if API endpoints are responding
   */
  async checkApiHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    const name = 'API Health';
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        timeout: 5000,
      });

      const duration = performance.now() - start;
      
      if (response.ok) {
        return {
          name,
          status: 'pass',
          message: `API responding in ${duration.toFixed(2)}ms`,
          duration,
          timestamp: Date.now(),
        };
      } else {
        return {
          name,
          status: 'fail',
          message: `API returned ${response.status}: ${response.statusText}`,
          duration,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      const duration = performance.now() - start;
      return {
        name,
        status: 'fail',
        message: `API unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check if database connection is working
   */
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    const name = 'Database Connectivity';
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v2/predictions?limit=1`, {
        method: 'GET',
        timeout: 5000,
      });

      const duration = performance.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        if (data.data || data.predictions) {
          return {
            name,
            status: 'pass',
            message: `Database query successful in ${duration.toFixed(2)}ms`,
            duration,
            timestamp: Date.now(),
          };
        } else {
          return {
            name,
            status: 'warning',
            message: 'Database connected but no data returned',
            duration,
            timestamp: Date.now(),
          };
        }
      } else {
        return {
          name,
          status: 'fail',
          message: `Database query failed: ${response.status}`,
          duration,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      const duration = performance.now() - start;
      return {
        name,
        status: 'fail',
        message: `Database unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check authentication service
   */
  async checkAuthHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    const name = 'Authentication Service';
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return {
          name,
          status: 'fail',
          message: 'Supabase credentials not configured',
          duration: performance.now() - start,
          timestamp: Date.now(),
        };
      }

      // Test Supabase connection
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        timeout: 5000,
      });

      const duration = performance.now() - start;
      
      if (response.status === 200 || response.status === 404) {
        // 404 is expected for root endpoint
        return {
          name,
          status: 'pass',
          message: `Auth service responding in ${duration.toFixed(2)}ms`,
          duration,
          timestamp: Date.now(),
        };
      } else {
        return {
          name,
          status: 'fail',
          message: `Auth service returned ${response.status}`,
          duration,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      const duration = performance.now() - start;
      return {
        name,
        status: 'fail',
        message: `Auth service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check browser environment and capabilities
   */
  async checkBrowserHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    const name = 'Browser Compatibility';
    
    const checks = [
      { feature: 'localStorage', test: () => typeof Storage !== 'undefined' },
      { feature: 'sessionStorage', test: () => typeof Storage !== 'undefined' },
      { feature: 'fetch', test: () => typeof fetch !== 'undefined' },
      { feature: 'Promise', test: () => typeof Promise !== 'undefined' },
      { feature: 'WebSocket', test: () => typeof WebSocket !== 'undefined' },
      { feature: 'Intl', test: () => typeof Intl !== 'undefined' },
      { feature: 'IntersectionObserver', test: () => typeof IntersectionObserver !== 'undefined' },
    ];

    const failedChecks = checks.filter(check => !check.test());
    const duration = performance.now() - start;
    
    if (failedChecks.length === 0) {
      return {
        name,
        status: 'pass',
        message: 'All browser features supported',
        duration,
        timestamp: Date.now(),
      };
    } else if (failedChecks.length <= 2) {
      return {
        name,
        status: 'warning',
        message: `Some features missing: ${failedChecks.map(c => c.feature).join(', ')}`,
        duration,
        timestamp: Date.now(),
      };
    } else {
      return {
        name,
        status: 'fail',
        message: `Critical features missing: ${failedChecks.map(c => c.feature).join(', ')}`,
        duration,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check performance metrics
   */
  async checkPerformanceHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    const name = 'Performance Metrics';
    
    const issues: string[] = [];
    
    // Check memory usage if available
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usagePercent > 80) {
        issues.push(`High memory usage: ${usagePercent.toFixed(1)}%`);
      }
    }
    
    // Check if we have performance timing
    if (performance.timing) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      if (loadTime > 5000) {
        issues.push(`Slow page load: ${loadTime}ms`);
      }
    }
    
    // Check for long tasks (if supported)
    try {
      if ('PerformanceObserver' in window) {
        // This is async but we'll make it sync for this demo
        const longTasks = performance.getEntriesByType('longtask');
        if (longTasks.length > 5) {
          issues.push(`${longTasks.length} long tasks detected`);
        }
      }
    } catch (e) {
      // Performance observer not supported
    }
    
    const duration = performance.now() - start;
    
    if (issues.length === 0) {
      return {
        name,
        status: 'pass',
        message: 'Performance metrics within acceptable ranges',
        duration,
        timestamp: Date.now(),
      };
    } else if (issues.length <= 2) {
      return {
        name,
        status: 'warning',
        message: `Performance issues: ${issues.join(', ')}`,
        duration,
        timestamp: Date.now(),
      };
    } else {
      return {
        name,
        status: 'fail',
        message: `Critical performance issues: ${issues.join(', ')}`,
        duration,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check local storage and session state
   */
  async checkStorageHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    const name = 'Storage & Session';
    
    const issues: string[] = [];
    
    try {
      // Test localStorage
      const testKey = '_health_check_test';
      localStorage.setItem(testKey, 'test');
      if (localStorage.getItem(testKey) !== 'test') {
        issues.push('localStorage not working');
      } else {
        localStorage.removeItem(testKey);
      }
    } catch (e) {
      issues.push('localStorage access denied');
    }
    
    try {
      // Test sessionStorage
      const testKey = '_health_check_session';
      sessionStorage.setItem(testKey, 'test');
      if (sessionStorage.getItem(testKey) !== 'test') {
        issues.push('sessionStorage not working');
      } else {
        sessionStorage.removeItem(testKey);
      }
    } catch (e) {
      issues.push('sessionStorage access denied');
    }
    
    // Check for essential data
    const authToken = localStorage.getItem('token');
    const sessionData = sessionStorage.getItem('currentUser');
    
    if (!authToken && !sessionData) {
      // This might be expected for new users
    }
    
    const duration = performance.now() - start;
    
    if (issues.length === 0) {
      return {
        name,
        status: 'pass',
        message: 'Storage systems working correctly',
        duration,
        timestamp: Date.now(),
      };
    } else {
      return {
        name,
        status: 'fail',
        message: `Storage issues: ${issues.join(', ')}`,
        duration,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckSuite> {
    const suiteStart = performance.now();
    
    console.log('🏥 Running health checks...');
    
    const checks = [
      this.checkBrowserHealth(),
      this.checkStorageHealth(),
      this.checkApiHealth(),
      this.checkDatabaseHealth(),
      this.checkAuthHealth(),
      this.checkPerformanceHealth(),
    ];
    
    const results = await Promise.all(checks);
    
    const suite: HealthCheckSuite = {
      suite: 'FCZ Application Health Check',
      totalChecks: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length,
      duration: performance.now() - suiteStart,
      results,
    };
    
    // Log results
    console.log('📊 Health Check Results:');
    results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.name}: ${result.message} (${result.duration.toFixed(2)}ms)`);
    });
    
    console.log(`\n📈 Summary: ${suite.passed} passed, ${suite.warnings} warnings, ${suite.failed} failed`);
    
    return suite;
  }

  /**
   * Quick smoke test for critical functionality
   */
  async smokeTest(): Promise<boolean> {
    console.log('🔥 Running smoke tests...');
    
    const criticalChecks = [
      this.checkBrowserHealth(),
      this.checkStorageHealth(),
      this.checkApiHealth(),
    ];
    
    const results = await Promise.all(criticalChecks);
    const criticalFailures = results.filter(r => r.status === 'fail');
    
    if (criticalFailures.length === 0) {
      console.log('✅ Smoke tests passed - critical functionality working');
      return true;
    } else {
      console.error('❌ Smoke tests failed:', criticalFailures.map(r => r.message));
      return false;
    }
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();

// Expose to window for manual testing
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).healthChecker = healthChecker;
}

export default HealthChecker;
