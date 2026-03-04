/**
 * Required schema for /health/deep: tables (and optional critical columns) the backend expects.
 * Used to fail fast when staging is missing migrations.
 */

export const REQUIRED_TABLES = [
  'users',
  'wallets',
  'wallet_transactions',
  'predictions',
  'prediction_options',
  'prediction_entries',
  'comments',
  'categories',
] as const;

/** Tables that may not exist on minimal staging (e.g. achievements); deep health reports but does not fail overall. */
export const OPTIONAL_TABLES = ['user_awards_current', 'award_definitions', 'user_stats_daily', 'badge_definitions', 'user_badges'] as const;

export type RequiredTableName = (typeof REQUIRED_TABLES)[number];
export type OptionalTableName = (typeof OPTIONAL_TABLES)[number];
