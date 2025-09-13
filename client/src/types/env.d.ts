/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL: string
  readonly VITE_CURRENCY: string
  readonly VITE_IMAGE_GENERATION_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global types
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

export {}
