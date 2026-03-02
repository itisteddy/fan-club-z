import { z } from 'zod';

export const EnvSchema = z.object({
  // Accept both standard Node env modes and Vite build target modes (web/ios/android)
  MODE: z.enum(['development', 'production', 'test', 'web', 'ios', 'android']),
  VITE_API_BASE: z.string().optional(), // explicit override only when provided
  VITE_IMAGES_FEATURE_FLAG: z.string().optional(), // "true"/"false"
  VITE_IMAGES_PROVIDER: z.enum(['none', 'pexels', 'unsplash']).default('none'),
});

export type Env = z.infer<typeof EnvSchema>;
