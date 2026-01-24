import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Browser } from '@capacitor/browser';
import { OAuth2Client } from '@byteowls/capacitor-oauth2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/environment';
import { captureReturnTo } from '@/lib/returnTo';
import { BUILD_TARGET } from '@/config/runtime';

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

// Helper to get the proper redirect URL for any environment
// Phase 2: Use BUILD_TARGET to determine redirect URL (not isNative alone)
// iOS builds use deep link scheme (fanclubz://), web uses HTTPS
function getRedirectUrl(next?: string) {
  const appendNext = (base: string) => {
    if (!next) return base;
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}next=${encodeURIComponent(next)}`;
  };

  // Phase 2: Use BUILD_TARGET instead of runtime isNative check
  // This ensures web behavior is never affected by native detection
  const isIOSBuild = BUILD_TARGET === 'ios';
  
  // Log for debugging
  console.log('🔧 getRedirectUrl called:', { buildTarget: BUILD_TARGET, isIOSBuild, next });

  // CRITICAL: iOS builds MUST use deep link scheme for OAuth callback
  // This allows the app to receive the callback and close the Browser sheet
  if (isIOSBuild) {
    const deepLinkUrl = 'fanclubz://auth/callback';
    console.log('🔧 Auth redirect URL (iOS deep link):', deepLinkUrl);
    return appendNext(deepLinkUrl);
  }

  // Check for explicit dev/local environment first
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // In local development, always use current origin
  if (isLocalDev) {
    const currentOrigin = window.location.origin;
    const fallback = `${currentOrigin}/auth/callback`;
    if (import.meta.env.DEV) {
      console.log('🔧 Auth redirect URL (local dev):', fallback);
    }
    return appendNext(fallback);
  }
  
  // Check if we have a custom redirect URL override (highest priority)
  if (import.meta.env.VITE_AUTH_REDIRECT_URL) {
    if (import.meta.env.DEV) {
      console.log('🔧 Auth redirect URL (override):', import.meta.env.VITE_AUTH_REDIRECT_URL);
    }
    return appendNext(import.meta.env.VITE_AUTH_REDIRECT_URL);
  }
  
  // In production web, always use the production URL (never localhost)
  const prodUrl = 'https://app.fanclubz.app/auth/callback';
  if (import.meta.env.DEV) {
    console.log('🔧 Auth redirect URL (production web):', prodUrl);
  }
  return appendNext(prodUrl);
}

export const buildAuthRedirectUrl = (next?: string) => getRedirectUrl(next);

const getAuthStorage = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('⚠️ Unable to access localStorage for Supabase auth storage:', error);
    return undefined;
  }
};

// Phase 3: Session persistence hardening
// detectSessionInUrl: false for native builds (we handle deep links manually)
// detectSessionInUrl: true for web (standard redirect flow)
const supabaseOptions: any = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: BUILD_TARGET === 'web', // Phase 3: Only detect in URL for web
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
        // Phase 3: Use BUILD_TARGET instead of isNativePlatform() for deterministic gating
        const isIOSBuild = BUILD_TARGET === 'ios';

        try {
          if (import.meta.env.DEV && isIOSBuild) {
            console.log('═══════════════════════════════════════');
            console.log('[OAuth] 🔐 OAUTH SIGN IN STARTED');
            console.log('[OAuth] Provider:', provider);
            console.log('[OAuth] BUILD_TARGET:', BUILD_TARGET);
            console.log('[OAuth] Next param:', options?.next);
            console.log('═══════════════════════════════════════');
          }
          
          // Phase 3: iOS builds use deep link, web uses HTTPS
          const redirectUrl = getRedirectUrl(options?.next);
          
          if (import.meta.env.DEV && isIOSBuild) {
            console.log('[OAuth] Final OAuth redirect URL:', redirectUrl);
            console.log('[OAuth] Expected for iOS: fanclubz://auth/callback');
            console.log('═══════════════════════════════════════');
          }

          // Emit auth started event for overlay (iOS only)
          if (isIOSBuild) {
            window.dispatchEvent(new CustomEvent('auth-in-progress', { detail: { started: true } }));
          }

          const { data, error} = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: isIOSBuild, // Phase 3: Skip browser redirect for iOS
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          });
          
          if (error) {
            console.error('[OAuth] Auth signInWithOAuth error:', error);
            if (isIOSBuild) {
              window.dispatchEvent(new CustomEvent('auth-in-progress', { detail: { started: false, error: true } }));
            }
          } else if (isIOSBuild && data?.url) {
            // CRITICAL FIX: Use OAuth2Client with ASWebAuthenticationSession
            // Browser.open uses SFSafariViewController which DOES NOT pass custom URL schemes back to app
            // OAuth2Client uses ASWebAuthenticationSession which DOES handle fanclubz:// properly
            if (import.meta.env.DEV) {
              console.log('═══════════════════════════════════════');
              console.log('[OAuth] 🔐 Using OAuth2Client (ASWebAuthenticationSession)');
              console.log('[OAuth] Supabase OAuth URL:', data.url);
              console.log('═══════════════════════════════════════');
            }

            try {
              // Parse Supabase's OAuth URL to extract components
              const authUrl = new URL(data.url);
              const redirectUrl = getRedirectUrl(options?.next);
              
              // Extract provider from URL (e.g., /auth/v1/authorize?provider=google)
              const providerParam = authUrl.searchParams.get('provider') || provider;
              
              // Supabase OAuth endpoint structure: {SUPABASE_URL}/auth/v1/authorize
              const authorizationBaseUrl = `${supabaseUrl}/auth/v1/authorize`;
              
              // Use OAuth2Client which properly handles custom URL schemes via ASWebAuthenticationSession
              const result = await OAuth2Client.authenticate({
                authorizationBaseUrl: authorizationBaseUrl,
                appId: SUPABASE_ANON_KEY, // Supabase uses anon key as client_id
                redirectUrl: redirectUrl,
                responseType: 'code',
                pkceEnabled: true,
                scope: 'openid email profile',
                accessTokenEndpoint: `${supabaseUrl}/auth/v1/token`, // For token exchange
                additionalParameters: {
                  provider: providerParam,
                  ...Object.fromEntries(authUrl.searchParams.entries()), // Pass all Supabase params
                },
                ios: {
                  responseType: 'code',
                  redirectUrl: redirectUrl,
                  pkceEnabled: true,
                },
                logsEnabled: import.meta.env.DEV,
              });

              if (import.meta.env.DEV) {
                console.log('[OAuth] ✅ OAuth2Client result:', result);
              }

              // OAuth2Client returns the code in the callback URL, extract it
              // The plugin handles the redirect and returns the authorization code
              if (result?.code) {
                const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.code);
                if (exchangeError) {
                  console.error('[OAuth] ❌ Code exchange failed:', exchangeError);
                  window.dispatchEvent(new CustomEvent('auth-in-progress', {
                    detail: { started: false, error: true, message: exchangeError.message }
                  }));
                } else if (sessionData?.session) {
                  if (import.meta.env.DEV) {
                    console.log('[OAuth] ✅ Session established via OAuth2Client');
                  }
                  window.dispatchEvent(new CustomEvent('auth-in-progress', {
                    detail: { started: false, completed: true }
                  }));
                }
              } else {
                console.error('[OAuth] ❌ No code in OAuth2Client result');
                window.dispatchEvent(new CustomEvent('auth-in-progress', {
                  detail: { started: false, error: true }
                }));
              }
            } catch (oauthError: any) {
              console.error('[OAuth] ❌ OAuth2Client error:', oauthError);
              // Fallback to Browser.open if OAuth2Client fails
              console.warn('[OAuth] Falling back to Browser.open');
              await Browser.open({
                url: data.url,
                presentationStyle: 'fullscreen',
              });
            }
          }
          
          return { data, error };
        } catch (error: any) {
          console.error('[OAuth] Auth signInWithOAuth exception:', error);
          if (isIOSBuild) {
            window.dispatchEvent(new CustomEvent('auth-in-progress', { detail: { started: false, error: true } }));
          }
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

// Phase 3: Native auth listener is registered at bootstrap in main.tsx
// No need to register here to prevent duplicates

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
