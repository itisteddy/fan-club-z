/**
 * Central type exports for client app
 * Re-exports shared types + client-specific domain models
 */

// Re-export shared types selectively to avoid conflicts
export type {
  Comment,
  PaginatedResponse,
  ActivityItem,
} from '@fanclubz/shared';

export type { AuthIntent, IntentMeta } from '../auth/authIntents';

// Export local domain types
export * from './domain';
export * from './api';

// Re-export ambient declarations
export * from './global.d';
