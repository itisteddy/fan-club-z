import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'fanclubz-web@1.0.0',
    },
  },
});

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, userData: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers for client-side operations
export const clientDb = {
  predictions: {
    async getAll(filters: any = {}) {
      let query = supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
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

      return { data, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
        `)
        .eq('id', id)
        .single();

      return { data, error };
    },

    async create(predictionData: any) {
      const { data, error } = await supabase
        .from('predictions')
        .insert(predictionData)
        .select()
        .single();

      return { data, error };
    },
  },

  users: {
    async getProfile(userId: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      return { data, error };
    },

    async updateProfile(userId: string, updates: any) {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    },
  },

  wallets: {
    async getBalance(userId: string, currency: string = 'NGN') {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('currency', currency)
        .single();

      return { data, error };
    },

    async getTransactions(userId: string, limit: number = 20) {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data, error };
    },
  },

  clubs: {
    async getAll(filters: any = {}) {
      let query = supabase
        .from('clubs')
        .select(`
          *,
          owner:users!owner_id(id, username, full_name, avatar_url)
        `);

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query
        .order('member_count', { ascending: false })
        .limit(filters.limit || 20);

      return { data, error };
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('clubs')
        .select(`
          *,
          owner:users!owner_id(id, username, full_name, avatar_url),
          members:club_members(
            id,
            role,
            joined_at,
            user:users(id, username, full_name, avatar_url)
          )
        `)
        .eq('id', id)
        .single();

      return { data, error };
    },
  },

  comments: {
    async getByPredictionId(predictionId: string, limit: number = 20) {
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

      return { data, error };
    },

    async create(commentData: any) {
      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select(`
          *,
          user:users(id, username, full_name, avatar_url)
        `)
        .single();

      return { data, error };
    },
  },
};

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
