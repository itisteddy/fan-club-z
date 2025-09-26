/**
 * Environment Variables Audit & Hardening
 * Comprehensive validation and security checks for environment configuration
 */

interface EnvVarConfig {
  key: string;
  required: boolean;
  sensitive: boolean;
  type: 'string' | 'boolean' | 'url' | 'number' | 'uuid';
  description: string;
  defaultValue?: string;
  validation?: (value: string) => boolean;
}

interface AuditResult {
  key: string;
  status: 'valid' | 'invalid' | 'missing' | 'insecure';
  message: string;
  value?: string;
  masked?: string;
}

interface EnvironmentAudit {
  passed: boolean;
  issues: number;
  warnings: number;
  results: AuditResult[];
  recommendations: string[];
  timestamp: number;
}

// Define expected environment variables with validation
const ENV_CONFIG: EnvVarConfig[] = [
  // Core API Configuration
  {
    key: 'VITE_API_BASE',
    required: true,
    sensitive: false,
    type: 'url',
    description: 'Base API URL for backend services',
    validation: (value) => /^https?:\/\//.test(value)
  },
  {
    key: 'VITE_FRONTEND_URL',
    required: true,
    sensitive: false,
    type: 'url',
    description: 'Frontend application URL',
    validation: (value) => /^https?:\/\//.test(value)
  },

  // Supabase Configuration
  {
    key: 'VITE_SUPABASE_URL',
    required: true,
    sensitive: false,
    type: 'url',
    description: 'Supabase project URL',
    validation: (value) => value.includes('supabase.co') || value.includes('localhost')
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    sensitive: true,
    type: 'string',
    description: 'Supabase anonymous key',
    validation: (value) => value.length > 100 // JWT tokens are long
  },

  // Feature Flags
  {
    key: 'VITE_FCZ_UNIFIED_HEADER',
    required: false,
    sensitive: false,
    type: 'boolean',
    description: 'Enable unified header design',
    defaultValue: '0',
    validation: (value) => ['0', '1', 'true', 'false'].includes(value)
  },
  {
    key: 'VITE_FCZ_UNIFIED_CARDS',
    required: false,
    sensitive: false,
    type: 'boolean',
    description: 'Enable unified card system',
    defaultValue: '0',
    validation: (value) => ['0', '1', 'true', 'false'].includes(value)
  },
  {
    key: 'VITE_FCZ_AUTH_GATE',
    required: false,
    sensitive: false,
    type: 'boolean',
    description: 'Enable new authentication gate',
    defaultValue: '1',
    validation: (value) => ['0', '1', 'true', 'false'].includes(value)
  },
  {
    key: 'VITE_FCZ_COMMENTS_V2',
    required: false,
    sensitive: false,
    type: 'boolean',
    description: 'Enable comments system v2',
    defaultValue: '1',
    validation: (value) => ['0', '1', 'true', 'false'].includes(value)
  },

  // Optional Services
  {
    key: 'VITE_DEBUG',
    required: false,
    sensitive: false,
    type: 'boolean',
    description: 'Enable debug mode',
    defaultValue: 'false',
    validation: (value) => ['true', 'false', '1', '0'].includes(value)
  },
  {
    key: 'VITE_VAPID_PUBLIC_KEY',
    required: false,
    sensitive: false,
    type: 'string',
    description: 'Web Push VAPID public key',
    validation: (value) => value.length > 80
  },
  {
    key: 'VITE_GOOGLE_ANALYTICS_ID',
    required: false,
    sensitive: false,
    type: 'string',
    description: 'Google Analytics measurement ID',
    validation: (value) => /^G-[A-Z0-9]+$/.test(value)
  },

  // Development Only
  {
    key: 'VITE_MOCK_API',
    required: false,
    sensitive: false,
    type: 'boolean',
    description: 'Use mock API responses (dev only)',
    defaultValue: 'false',
    validation: (value) => ['true', 'false'].includes(value)
  }
];

class EnvironmentAuditor {
  private envVars: Record<string, string> = {};

  constructor() {
    // Collect all VITE_ prefixed environment variables
    this.envVars = this.collectEnvVars();
  }

  /**
   * Collect environment variables safely
   */
  private collectEnvVars(): Record<string, string> {
    const vars: Record<string, string> = {};
    
    if (typeof import.meta.env === 'object') {
      Object.keys(import.meta.env).forEach(key => {
        if (key.startsWith('VITE_')) {
          vars[key] = import.meta.env[key]?.toString() || '';
        }
      });
    }
    
    return vars;
  }

  /**
   * Mask sensitive values for logging
   */
  private maskValue(value: string, sensitive: boolean): string {
    if (!sensitive) return value;
    
    if (value.length <= 8) {
      return '***';
    }
    
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }

  /**
   * Validate a single environment variable
   */
  private validateEnvVar(config: EnvVarConfig): AuditResult {
    const value = this.envVars[config.key];
    
    // Check if required variable is missing
    if (config.required && !value) {
      return {
        key: config.key,
        status: 'missing',
        message: `Required environment variable is missing: ${config.description}`,
      };
    }
    
    // Use default value if not provided
    if (!value && config.defaultValue) {
      return {
        key: config.key,
        status: 'valid',
        message: `Using default value for ${config.description}`,
        value: config.defaultValue,
        masked: config.sensitive ? this.maskValue(config.defaultValue, true) : config.defaultValue,
      };
    }
    
    // Skip validation if optional and not provided
    if (!config.required && !value) {
      return {
        key: config.key,
        status: 'valid',
        message: `Optional variable not configured: ${config.description}`,
      };
    }
    
    // Run custom validation if provided
    if (config.validation && !config.validation(value)) {
      return {
        key: config.key,
        status: 'invalid',
        message: `Invalid format for ${config.description}`,
        masked: config.sensitive ? this.maskValue(value, true) : value,
      };
    }
    
    // Type-specific validation
    switch (config.type) {
      case 'url':
        try {
          new URL(value);
        } catch {
          return {
            key: config.key,
            status: 'invalid',
            message: `Invalid URL format for ${config.description}`,
            masked: value,
          };
        }
        break;
        
      case 'number':
        if (isNaN(Number(value))) {
          return {
            key: config.key,
            status: 'invalid',
            message: `Expected number for ${config.description}`,
            masked: value,
          };
        }
        break;
        
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          return {
            key: config.key,
            status: 'invalid',
            message: `Invalid UUID format for ${config.description}`,
            masked: config.sensitive ? this.maskValue(value, true) : value,
          };
        }
        break;
    }
    
    // Check for potential security issues
    if (config.sensitive) {
      // Check if sensitive data might be exposed
      if (value.length < 10) {
        return {
          key: config.key,
          status: 'insecure',
          message: `Sensitive value appears too short: ${config.description}`,
          masked: this.maskValue(value, true),
        };
      }
      
      // Check for common insecure values
      const insecurePatterns = ['test', 'demo', 'local', 'development', '123'];
      if (insecurePatterns.some(pattern => value.toLowerCase().includes(pattern))) {
        return {
          key: config.key,
          status: 'insecure',
          message: `Potentially insecure value for production: ${config.description}`,
          masked: this.maskValue(value, true),
        };
      }
    }
    
    return {
      key: config.key,
      status: 'valid',
      message: `Valid configuration for ${config.description}`,
      value: config.sensitive ? undefined : value,
      masked: config.sensitive ? this.maskValue(value, true) : value,
    };
  }

  /**
   * Check for unused environment variables
   */
  private findUnusedVars(): string[] {
    const configuredKeys = new Set(ENV_CONFIG.map(c => c.key));
    return Object.keys(this.envVars).filter(key => !configuredKeys.has(key));
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(results: AuditResult[]): string[] {
    const recommendations: string[] = [];
    
    const issues = results.filter(r => r.status === 'invalid' || r.status === 'insecure');
    const missing = results.filter(r => r.status === 'missing');
    
    if (missing.length > 0) {
      recommendations.push(`Add missing required environment variables: ${missing.map(r => r.key).join(', ')}`);
    }
    
    if (issues.length > 0) {
      recommendations.push('Review and fix invalid/insecure environment variable configurations');
    }
    
    // Production-specific recommendations
    if (import.meta.env.PROD) {
      recommendations.push('Ensure all sensitive values use strong, production-ready credentials');
      recommendations.push('Verify HTTPS URLs are used for all external services');
      recommendations.push('Disable debug flags in production environment');
    }
    
    // Development-specific recommendations
    if (import.meta.env.DEV) {
      recommendations.push('Consider using .env.local for local development overrides');
      recommendations.push('Use mock services for development to avoid affecting production data');
    }
    
    return recommendations;
  }

  /**
   * Run complete environment audit
   */
  public runAudit(): EnvironmentAudit {
    console.log('🔍 Starting environment variable audit...');
    
    const results = ENV_CONFIG.map(config => this.validateEnvVar(config));
    const unusedVars = this.findUnusedVars();
    
    // Add results for unused variables
    unusedVars.forEach(key => {
      results.push({
        key,
        status: 'valid',
        message: 'Unused environment variable (consider cleanup)',
        value: this.envVars[key],
      });
    });
    
    const issues = results.filter(r => ['invalid', 'missing', 'insecure'].includes(r.status)).length;
    const warnings = results.filter(r => r.message.includes('Unused') || r.message.includes('default')).length;
    
    const audit: EnvironmentAudit = {
      passed: issues === 0,
      issues,
      warnings,
      results,
      recommendations: this.generateRecommendations(results),
      timestamp: Date.now(),
    };
    
    this.logAuditResults(audit);
    return audit;
  }

  /**
   * Log audit results to console
   */
  private logAuditResults(audit: EnvironmentAudit): void {
    console.log('📊 Environment Audit Results:');
    
    audit.results.forEach(result => {
      const icons = {
        valid: '✅',
        invalid: '❌',
        missing: '🔴',
        insecure: '⚠️'
      };
      
      const icon = icons[result.status];
      const displayValue = result.masked || result.value || '(not set)';
      
      console.log(`  ${icon} ${result.key}: ${result.message}`);
      if (result.status !== 'missing') {
        console.log(`    Value: ${displayValue}`);
      }
    });
    
    console.log(`\n📈 Summary: ${audit.results.length} variables checked, ${audit.issues} issues, ${audit.warnings} warnings`);
    
    if (audit.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      audit.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    if (audit.passed) {
      console.log('\n✅ Environment audit passed - configuration is secure');
    } else {
      console.warn('\n⚠️ Environment audit failed - please address the issues above');
    }
  }

  /**
   * Get environment summary for debugging
   */
  public getSummary(): {
    environment: string;
    configuredVars: number;
    missingRequired: number;
    hasIssues: boolean;
  } {
    const audit = this.runAudit();
    
    return {
      environment: import.meta.env.MODE || 'unknown',
      configuredVars: Object.keys(this.envVars).length,
      missingRequired: audit.results.filter(r => r.status === 'missing').length,
      hasIssues: !audit.passed,
    };
  }
}

// Export singleton instance
export const environmentAuditor = new EnvironmentAuditor();

// Auto-run audit in development
if (import.meta.env.DEV) {
  // Run audit after a short delay to allow app to load
  setTimeout(() => {
    environmentAuditor.runAudit();
  }, 2000);
}

// Expose to window for manual testing
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).environmentAuditor = environmentAuditor;
}

export default EnvironmentAuditor;
