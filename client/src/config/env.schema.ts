import { z } from 'zod';

export const EnvSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']),
  VITE_API_BASE: z.string().min(1), // "/api"
  VITE_IMAGES_FEATURE_FLAG: z.string().optional(), // "true"/"false"
  VITE_IMAGES_PROVIDER: z.enum(['none', 'pexels', 'unsplash']).default('none'),
});

export type Env = z.infer<typeof EnvSchema>;
