import { z } from "zod";

const ServerSchema = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  // Server-only secrets (MUST NOT start with VITE_)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  // Shared values (also available as VITE_* for client)
  API_BASE: z.string().url().optional(),
  PORT: z.string().transform(Number).optional(),
});

export const envServer = (() => {
  const parsed = ServerSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    API_BASE: process.env.API_BASE,
    PORT: process.env.PORT,
  });
  if (!parsed.success) {
    // Do not throw if optional, but print a clear error
    console.error("[env.server] Invalid config:", parsed.error.flatten().fieldErrors);
  }
  return parsed.success ? parsed.data : ({} as z.infer<typeof ServerSchema>);
})();

export type ServerEnv = z.infer<typeof ServerSchema>;
