import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { PluginListenerHandle } from '@capacitor/core';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/environment';
import { captureReturnTo } from '@/lib/returnTo';

// Environment variables from centralized config
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

console.log('🔧 Supabase Config Check:');
console.log('URL:', supabaseUrl ? '✅ Present' : '❌ Missing');
console.log('Anon Key:', supabaseAnonKey ? '✅ Present' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  throw new Error(
    `❌ Missing Supabase environment variables: ${missingVars.join(', ')}.\n` +
    'Please check your .env.development.local file and ensure these variables are set:\n' +
    '- VITE_SUPABASE_URL=https://your-project-ref.supabase.co\n' +
    '- VITE_SUPABASE_ANON_KEY=your-anon-public-key-here'
  );
}

const isNativePlatform = () => typeof window !== 'undefined' && Boolean(Capacitor?.isNativePlatform?.());

// Helper to get the proper redirect URL for any environment
// Uses HTTPS redirects for all platforms (Web OAuth client supports both web and native)
function getRedirectUrl(next?: string) {
  console.log('🔍 getRedirectUrl called - hostname:', window.location.hostname);
  
  const appendNext = (base: string) => {
    if (!next) return base;
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}next=${encodeURIComponent(next)}`;
  };

  // Check for explicit dev/local environment first
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  console.log('🔍 isLocalDev check:', isLocalDev);
  
  // In local development, always use current origin
  if (isLocalDev) {
    const currentOrigin = window.location.origin;
    const fallback = `${currentOrigin}/auth/callback`;
    console.log('🔧 Auth redirect URL (local dev):', fallback);
    return appendNext(fallback);
  }
  
  // Check if we have a custom redirect URL override
  if (import.meta.env.VITE_AUTH_REDIRECT_URL) {
    console.log('🔧 Auth redirect URL (override):', import.meta.env.VITE_AUTH_REDIRECT_URL);
    return appendNext(import.meta.env.VITE_AUTH_REDIRECT_URL);
  }
  
  // In production, use the production URL
  const prodUrl = 'https://app.fanclubz.app/auth/callback';
  console.log('🔧 Auth redirect URL (production):', prodUrl);
  return appendNext(prodUrl);
}

export const buildAuthRedirectUrl = (next?: string) => getRedirectUrl(next);

let nativeAuthListener: Promise<PluginListenerHandle> | null = null;

const ensureNativeAuthListener = () => {
  if (!isNativePlatform() || nativeAuthListener) return;

  nativeAuthListener = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    try {
      // Handle HTTPS callback URLs (app.fanclubz.app/auth/callback)
      if (!url || (!url.includes('app.fanclubz.app/auth/callback') && !url.includes('localhost') && !url.includes('127.0.0.1'))) {
        return;
      }

      console.log('🔐 Native auth callback received:', url);

      await Browser.close().catch(() => undefined);

      // Supabase will automatically handle the session from the URL
      // The AuthCallback route component will process it
    } catch (err) {
      console.error('❌ Native auth listener exception:', err);
    }
  });
};

const getAuthStorage = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('⚠️ Unable to access localStorage for Supabase auth storage:', error);
    return undefined;
  }
};

const supabaseOptions: any = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'fanclubz-web@1.0.0',
    },
  },
};

const authStorage = getAuthStorage();
if (authStorage) {
  supabaseOptions.auth = {
    ...supabaseOptions.auth,
    storage: authStorage,
    storageKey: 'fcz-auth-storage',
  };
}

type TypedSupabaseClient = SupabaseClient<any, any, any>;

type GlobalWithSupabase = typeof globalThis & {
  __fanclubzSupabase?: TypedSupabaseClient;
};

const globalWithSupabase = globalThis as GlobalWithSupabase;

// Create Supabase client with proper OAuth configuration
export const supabase: TypedSupabaseClient =
  globalWithSupabase.__fanclubzSupabase ??
  (createClient(supabaseUrl, supabaseAnonKey, supabaseOptions) as TypedSupabaseClient);

if (!globalWithSupabase.__fanclubzSupabase) {
  globalWithSupabase.__fanclubzSupabase = supabase;
}

// Test the connection on initialization
const testConnection = async () => {
  try {
    // Simple auth check instead of table access
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('⚠️ Supabase auth check failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error: any) {
    console.warn('⚠️ Supabase connection test failed:', error.message);
    // Don't throw error - let the app continue to work
  }
};

// Run connection test in development
import { isDev } from '@/utils/environment';
if (isDev) {
  testConnection();
}

// Auth helpers with better error handling and dynamic redirect URLs
type OAuthProvider = 'google' | 'github' | 'discord' | 'apple';

export const auth = {
  signUp: async (email: string, password: string, userData: any = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: getRedirectUrl(),
        },
      });
      
      if (error) {
        console.error('Auth signUp error:', error);
      }
      
      return { data, error };
    } catch (error: any) {
      console.error('Auth signUp exception:', error);
      return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Auth signIn error:', error);
      }
      
      return { data, error };
    } catch (error: any) {
      console.error('Auth signIn exception:', error);
      return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
    }
  },

      signInWithOAuth: async (provider: OAuthProvider, options?: { next?: string }) => {
        const native = isNativePlatform();
        if (native) {
          ensureNativeAuthListener();
        }

        try {
          console.log('═══════════════════════════════════════');
          console.log('🔐 OAUTH SIGN IN STARTED');
          console.log('  Provider:', provider);
          console.log('  Next param:', options?.next);
          console.log('  Current hostname:', window.location.hostname);
          console.log('  Current origin:', window.location.origin);
          console.log('═══════════════════════════════════════');
          
          const redirectUrl = getRedirectUrl(options?.next);
          console.log('🔐 Final OAuth redirect URL:', redirectUrl);
          console.log('═══════════════════════════════════════');

          const { data, error} = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: native,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          });
          
          if (error) {
            console.error('Auth signInWithOAuth error:', error);
          } else if (native && data?.url) {
            await Browser.open({
              url: data.url,
              presentationStyle: 'fullscreen',
            });
          }
          
          return { data, error };
        } catch (error: any) {
          console.error('Auth signInWithOAuth exception:', error);
          return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
        }
      },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Auth signOut error:', error);
      }
      
      return { error };
    } catch (error: any) {
      console.error('Auth signOut exception:', error);
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth getCurrentUser error:', error);
      }
      
      return { user, error };
    } catch (error: any) {
      console.error('Auth getCurrentUser exception:', error);
      return { user: null, error: { message: error.message || 'An unexpected error occurred' } };
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers for client-side operations
export const clientDb = {
  predictions: {
    async getAll(filters: any = {}) {
      try {
        let query = supabase
          .from('predictions')
          .select(`
            *,
            creator:users!creator_id(id, username, full_name, avatar_url),
            options:prediction_options!prediction_options_prediction_id_fkey(*),
          `);

        if (filters.category) {
          query = query.eq('category', filters.category);
        }

        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(filters.limit || 20);

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error('Database error in predictions.getAll:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in predictions.getAll:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },

    async getById(id: string) {
      try {
        const { data, error } = await supabase
          .from('predictions')
          .select(`
            *,
            creator:users!creator_id(id, username, full_name, avatar_url),
            options:prediction_options!prediction_options_prediction_id_fkey(*),
          `)
          .eq('id', id)
          .single();

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error('Database error in predictions.getById:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in predictions.getById:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },

    async create(predictionData: any) {
      try {
        const { data, error } = await supabase
          .from('predictions')
          .insert(predictionData)
          .select()
          .single();

        if (error) {
          console.error('Database error in predictions.create:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in predictions.create:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },
  },

  users: {
    async getProfile(userId: string) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error('Database error in users.getProfile:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in users.getProfile:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },

    async updateProfile(userId: string, updates: any) {
      try {
        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          console.error('Database error in users.updateProfile:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in users.updateProfile:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },
  },

  wallets: {
    async getBalance(userId: string, currency: string = 'NGN') {
      try {
        const { data, error } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .eq('currency', currency)
          .single();

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error('Database error in wallets.getBalance:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in wallets.getBalance:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },

    async getTransactions(userId: string, limit: number = 20) {
      try {
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error('Database error in wallets.getTransactions:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in wallets.getTransactions:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },
  },


  comments: {
    async getByPredictionId(predictionId: string, limit: number = 20) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            user:users(id, username, full_name, avatar_url)
          `)
          .eq('prediction_id', predictionId)
          .is('parent_comment_id', null)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error('Database error in comments.getByPredictionId:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in comments.getByPredictionId:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },

    async create(commentData: any) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .insert(commentData)
          .select(`
            *,
            user:users(id, username, full_name, avatar_url)
          `)
          .single();

        if (error) {
          console.error('Database error in comments.create:', error);
        }

        return { data, error };
      } catch (error: any) {
        console.error('Exception in comments.create:', error);
        return { data: null, error: { message: error.message || 'An unexpected error occurred' } };
      }
    },
  },
};

if (isNativePlatform()) {
  ensureNativeAuthListener();
}

// Real-time subscriptions
export const realtime = {
  subscribeToComments: (predictionId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`comments:${predictionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `prediction_id=eq.${predictionId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToReactions: (predictionId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`reactions:${predictionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `prediction_id=eq.${predictionId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToPredictionUpdates: (callback: (payload: any) => void) => {
    return supabase
      .channel('predictions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions',
        },
        callback
      )
      .subscribe();
  },
};

export default supabase;
