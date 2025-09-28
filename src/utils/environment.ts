// Re-export the new environment config for backward compatibility
export { env } from '../config/env';

// Legacy exports for compatibility
export const FCZ_UNIFIED_HEADER = env.VITE_IMAGES_FEATURE_FLAG === 'true';
export const FCZ_UNIFIED_CARDS = true;
export const FCZ_DISCOVER_V2 = true;
export const FCZ_PREDICTION_DETAILS_V2 = true;
export const FCZ_SHARED_CARDS = true;
export const FCZ_AUTH_GATE = true;
export const FCZ_COMMENTS_V2 = true;
export const FCZ_COMMENTS_SORT = true;
