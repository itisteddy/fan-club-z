import { EnvSchema } from './env.schema';

export const env = EnvSchema.parse({
  MODE: import.meta.env.MODE,
  VITE_API_BASE: import.meta.env.VITE_API_BASE,
  VITE_IMAGES_FEATURE_FLAG: import.meta.env.VITE_IMAGES_FEATURE_FLAG,
  VITE_IMAGES_PROVIDER: import.meta.env.VITE_IMAGES_PROVIDER,
});
