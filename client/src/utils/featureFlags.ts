/**
 * Feature Flag Management System
 * Centralized control for feature rollouts and A/B testing
 */

import { environmentAuditor } from './environmentAudit';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environment?: 'development' | 'staging' | 'production' | 'all';
  rolloutPercentage?: number;
  dependencies?: string[];
  deprecated?: boolean;
  expiryDate?: string;
}

export interface FeatureFlagConfig {
  flags: FeatureFlag[];
  userSegment?: string;
  sessionId?: string;
  lastUpdated: number;
}

class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private userSegment: string = 'default';
  private sessionId: string = '';

  constructor() {
    this.initializeFlags();
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a session ID for consistent flag evaluation
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Initialize feature flags from environment and defaults
   */
  private initializeFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      // UI/UX Improvements
      {
        key: 'UNIFIED_HEADER',
        name: 'Unified Header Design',
        description: 'Enable the new unified header across all pages',
        enabled: this.getEnvFlag('VITE_FCZ_UNIFIED_HEADER', true),
        environment: 'all',
      },
      {
        key: 'UNIFIED_CARDS',
        name: 'Unified Card System',
        description: 'Enable consistent card design across Profile and Wallet',
        enabled: this.getEnvFlag('VITE_FCZ_UNIFIED_CARDS', true),
        environment: 'all',
      },
      {
        key: 'DISCOVER_V2',
        name: 'Discover Page V2',
        description: 'Enhanced discover page with improved filtering and search',
        enabled: this.getEnvFlag('VITE_FCZ_DISCOVER_V2', true),
        environment: 'all',
      },
      {
        key: 'PREDICTION_DETAILS_V2',
        name: 'Prediction Details V2',
        description: 'Redesigned prediction details page with better UX',
        enabled: this.getEnvFlag('VITE_FCZ_PREDICTION_DETAILS_V2', true),
        environment: 'all',
      },

      // Authentication & Social
      {
        key: 'AUTH_GATE',
        name: 'New Authentication Gate',
        description: 'Unified authentication modal with intent-based flows',
        enabled: this.getEnvFlag('VITE_FCZ_AUTH_GATE', true),
        environment: 'all',
      },
      {
        key: 'COMMENTS_V2',
        name: 'Comments System V2',
        description: 'Enhanced comments with real-time updates and improved UX',
        enabled: this.getEnvFlag('VITE_FCZ_COMMENTS_V2', true),
        environment: 'all',
      },
      {
        key: 'COMMENTS_SORT',
        name: 'Comment Sorting Options',
        description: 'Allow users to sort comments by date, popularity, etc.',
        enabled: this.getEnvFlag('VITE_FCZ_COMMENTS_SORT', false),
        environment: 'all',
        rolloutPercentage: 50,
      },
      {
        key: 'SHARED_CARDS',
        name: 'Shared Card Components',
        description: 'Use shared card components across the application',
        enabled: this.getEnvFlag('VITE_FCZ_SHARED_CARDS', true),
        environment: 'all',
      },

      // Performance & Development
      {
        key: 'LAZY_LOADING',
        name: 'Lazy Loading Components',
        description: 'Enable code-splitting and lazy loading for better performance',
        enabled: true,
        environment: 'all',
      },
      {
        key: 'PERFORMANCE_MONITORING',
        name: 'Performance Monitoring',
        description: 'Enable real-time performance metrics collection',
        enabled: import.meta.env.DEV,
        environment: 'all',
      },
      {
        key: 'DEBUG_MODE',
        name: 'Debug Mode',
        description: 'Enable debug logging and development tools',
        enabled: this.getEnvFlag('VITE_DEBUG', false),
        environment: 'development',
      },

      // Experimental Features
      {
        key: 'PWA_INSTALL',
        name: 'PWA Installation Prompt',
        description: 'Show install prompt for Progressive Web App',
        enabled: true,
        environment: 'all',
        rolloutPercentage: 80,
      },
      {
        key: 'PUSH_NOTIFICATIONS',
        name: 'Push Notifications',
        description: 'Enable browser push notifications for updates',
        enabled: !!import.meta.env.VITE_VAPID_PUBLIC_KEY,
        environment: 'all',
        rolloutPercentage: 30,
      },
      {
        key: 'OFFLINE_MODE',
        name: 'Offline Mode Support',
        description: 'Enable offline functionality with cached content',
        enabled: false,
        environment: 'all',
        rolloutPercentage: 10,
        deprecated: false,
        expiryDate: '2024-12-31',
      },

      // A/B Testing
      {
        key: 'ONBOARDING_FLOW',
        name: 'New User Onboarding',
        description: 'Enhanced onboarding flow for new users',
        enabled: false,
        environment: 'all',
        rolloutPercentage: 25,
      },
      {
        key: 'GAMIFICATION',
        name: 'Gamification Elements',
        description: 'Add badges, achievements, and progression systems',
        enabled: false,
        environment: 'staging',
        rolloutPercentage: 5,
      },
    ];

    // Initialize flag map
    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, flag);
    });
  }

  /**
   * Get boolean flag from environment variables
   */
  private getEnvFlag(envKey: string, defaultValue: boolean = false): boolean {
    const value = import.meta.env[envKey];
    if (value === undefined) return defaultValue;
    return value === '1' || value === 'true';
  }

  /**
   * Hash string for consistent percentage-based rollouts
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Check if feature is enabled for current user/session
   */
  public isEnabled(flagKey: string): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      console.warn(`🚩 Feature flag "${flagKey}" not found, defaulting to false`);
      return false;
    }

    // Check if flag is deprecated
    if (flag.deprecated) {
      console.warn(`🚩 Feature flag "${flagKey}" is deprecated and should be removed`);
    }

    // Check if flag has expired
    if (flag.expiryDate && new Date() > new Date(flag.expiryDate)) {
      console.warn(`🚩 Feature flag "${flagKey}" has expired on ${flag.expiryDate}`);
      return false;
    }

    // Check environment restrictions
    if (flag.environment && flag.environment !== 'all') {
      const currentEnv = import.meta.env.MODE as 'development' | 'staging' | 'production';
      if (flag.environment !== currentEnv) {
        return false;
      }
    }

    // Check dependencies
    if (flag.dependencies) {
      const unmetDependencies = flag.dependencies.filter(dep => !this.isEnabled(dep));
      if (unmetDependencies.length > 0) {
        console.warn(`🚩 Feature flag "${flagKey}" disabled due to unmet dependencies: ${unmetDependencies.join(', ')}`);
        return false;
      }
    }

    // If not base enabled, return false
    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const hash = this.hashString(flagKey + this.sessionId);
      return hash < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get flag details
   */
  public getFlag(flagKey: string): FeatureFlag | null {
    return this.flags.get(flagKey) || null;
  }

  /**
   * Get all flags
   */
  public getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get enabled flags only
   */
  public getEnabledFlags(): FeatureFlag[] {
    return this.getAllFlags().filter(flag => this.isEnabled(flag.key));
  }

  /**
   * Override flag for testing (development only)
   */
  public override(flagKey: string, enabled: boolean): void {
    if (!import.meta.env.DEV) {
      console.warn('🚩 Feature flag overrides are only available in development');
      return;
    }

    const flag = this.flags.get(flagKey);
    if (flag) {
      flag.enabled = enabled;
      console.log(`🚩 Feature flag "${flagKey}" overridden to ${enabled}`);
    } else {
      console.warn(`🚩 Cannot override unknown feature flag "${flagKey}"`);
    }
  }

  /**
   * Get feature flag status summary
   */
  public getSummary(): {
    total: number;
    enabled: number;
    rollout: number;
    deprecated: number;
    expired: number;
  } {
    const flags = this.getAllFlags();
    
    return {
      total: flags.length,
      enabled: flags.filter(f => this.isEnabled(f.key)).length,
      rollout: flags.filter(f => f.rolloutPercentage && f.rolloutPercentage < 100).length,
      deprecated: flags.filter(f => f.deprecated).length,
      expired: flags.filter(f => f.expiryDate && new Date() > new Date(f.expiryDate)).length,
    };
  }

  /**
   * Log flag status for debugging
   */
  public debugFlags(): void {
    console.log('🚩 Feature Flags Status:');
    
    const flags = this.getAllFlags();
    flags.forEach(flag => {
      const enabled = this.isEnabled(flag.key);
      const icon = enabled ? '✅' : '❌';
      const rollout = flag.rolloutPercentage ? ` (${flag.rolloutPercentage}%)` : '';
      const deprecated = flag.deprecated ? ' [DEPRECATED]' : '';
      const expired = flag.expiryDate && new Date() > new Date(flag.expiryDate) ? ' [EXPIRED]' : '';
      
      console.log(`  ${icon} ${flag.key}: ${flag.name}${rollout}${deprecated}${expired}`);
      console.log(`    ${flag.description}`);
    });
    
    const summary = this.getSummary();
    console.log(`\n📊 Summary: ${summary.enabled}/${summary.total} enabled, ${summary.rollout} in rollout, ${summary.deprecated} deprecated`);
  }
}

// Create singleton instance
export const featureFlags = new FeatureFlagManager();

// Convenience functions for common flags
export const isUnifiedHeaderEnabled = () => featureFlags.isEnabled('UNIFIED_HEADER');
export const isUnifiedCardsEnabled = () => featureFlags.isEnabled('UNIFIED_CARDS');
export const isAuthGateEnabled = () => featureFlags.isEnabled('AUTH_GATE');
export const isCommentsV2Enabled = () => featureFlags.isEnabled('COMMENTS_V2');
export const isDiscoverV2Enabled = () => featureFlags.isEnabled('DISCOVER_V2');
export const isPredictionDetailsV2Enabled = () => featureFlags.isEnabled('PREDICTION_DETAILS_V2');
export const isPerformanceMonitoringEnabled = () => featureFlags.isEnabled('PERFORMANCE_MONITORING');
export const isDebugModeEnabled = () => featureFlags.isEnabled('DEBUG_MODE');

// Expose to window for debugging
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).featureFlags = featureFlags;
  
  // Auto-log flags in development
  setTimeout(() => {
    featureFlags.debugFlags();
  }, 1000);
}

export default featureFlags;
