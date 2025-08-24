"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.supabaseAnon = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const index_1 = __importDefault(require("./index"));
// Create Supabase client with service role for server-side operations
exports.supabase = (0, supabase_js_1.createClient)(index_1.default.supabase.url, index_1.default.supabase.serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
    db: {
        schema: 'public',
    },
});
// Create Supabase client with anon key for client-side operations
exports.supabaseAnon = (0, supabase_js_1.createClient)(index_1.default.supabase.url, index_1.default.supabase.anonKey);
// Database helper functions
exports.db = {
    // User operations
    users: {
        async findById(id) {
            const { data, error } = await exports.supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();
            if (error)
                throw error;
            return data;
        },
        async findByEmail(email) {
            const { data, error } = await exports.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            if (error && error.code !== 'PGRST116')
                throw error;
            return data;
        },
        async create(userData) {
            const { data, error } = await exports.supabase
                .from('users')
                .insert(userData)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        async update(id, updates) {
            const { data, error } = await exports.supabase
                .from('users')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
    },
    // Prediction operations
    predictions: {
        async findById(id) {
            const { data, error } = await exports.supabase
                .from('predictions')
                .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options!prediction_options_prediction_id_fkey(*),
          club:clubs(id, name, avatar_url)
        `)
                .eq('id', id)
                .single();
            if (error)
                throw error;
            return data;
        },
        async findMany(filters = {}, pagination = {}) {
            let query = exports.supabase
                .from('predictions')
                .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options!prediction_options_prediction_id_fkey(*),
          club:clubs(id, name, avatar_url)
        `, { count: 'exact' });
            // Apply filters
            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.creator_id) {
                query = query.eq('creator_id', filters.creator_id);
            }
            if (filters.club_id) {
                query = query.eq('club_id', filters.club_id);
            }
            if (filters.search) {
                query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
            }
            // Apply sorting
            const sortColumn = filters.sort || 'created_at';
            const sortOrder = filters.order || 'desc';
            query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
            // Apply pagination
            const page = pagination.page || 1;
            const limit = pagination.limit || 20;
            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);
            const { data, error, count } = await query;
            if (error)
                throw error;
            return {
                data: data || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasNext: page * limit < (count || 0),
                    hasPrev: page > 1,
                },
            };
        },
        async create(predictionData) {
            const { data, error } = await exports.supabase
                .from('predictions')
                .insert(predictionData)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        async update(id, updates) {
            const { data, error } = await exports.supabase
                .from('predictions')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
    },
    // Wallet operations
    wallets: {
        async findByUserId(userId, currency = 'USD') {
            const { data, error } = await exports.supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .eq('currency', currency)
                .single();
            if (error && error.code !== 'PGRST116')
                throw error;
            return data;
        },
        async createOrUpdate(userId, currency = 'USD', updates = {}) {
            const { data, error } = await exports.supabase
                .from('wallets')
                .upsert({
                user_id: userId,
                currency,
                ...updates,
                updated_at: new Date().toISOString(),
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        async updateBalance(userId, currency, availableChange, reservedChange = 0) {
            try {
                // First check if RPC function exists and use it
                const { data, error } = await exports.supabase.rpc('update_wallet_balance', {
                    user_id: userId,
                    currency_code: currency,
                    available_change: availableChange,
                    reserved_change: reservedChange,
                });
                if (error) {
                    console.error('RPC function error, falling back to direct update:', error);
                    // Fallback to direct wallet update
                    return await this.directUpdateBalance(userId, currency, availableChange, reservedChange);
                }
                return data;
            }
            catch (rpcError) {
                console.error('RPC function not available, using direct update:', rpcError);
                // Fallback to direct wallet update
                return await this.directUpdateBalance(userId, currency, availableChange, reservedChange);
            }
        },
        async directUpdateBalance(userId, currency, availableChange, reservedChange = 0) {
            // First, get current wallet or create one
            let wallet = await this.findByUserId(userId, currency);
            if (!wallet) {
                // Create new wallet
                wallet = await this.createOrUpdate(userId, currency, {
                    available_balance: Math.max(0, availableChange),
                    reserved_balance: Math.max(0, reservedChange),
                });
            }
            else {
                // Update existing wallet
                const newAvailable = Math.max(0, wallet.available_balance + availableChange);
                const newReserved = Math.max(0, wallet.reserved_balance + reservedChange);
                wallet = await this.createOrUpdate(userId, currency, {
                    available_balance: newAvailable,
                    reserved_balance: newReserved,
                });
            }
            return wallet;
        },
    },
    // Transaction operations
    transactions: {
        async create(transactionData) {
            const { data, error } = await exports.supabase
                .from('wallet_transactions')
                .insert(transactionData)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        async findByUserId(userId, pagination = {}) {
            const page = pagination.page || 1;
            const limit = pagination.limit || 20;
            const offset = (page - 1) * limit;
            const { data, error, count } = await exports.supabase
                .from('wallet_transactions')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error)
                throw error;
            return {
                data: data || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasNext: page * limit < (count || 0),
                    hasPrev: page > 1,
                },
            };
        },
        async updateStatus(id, status, updates = {}) {
            const { data, error } = await exports.supabase
                .from('wallet_transactions')
                .update({
                status,
                ...updates,
                updated_at: new Date().toISOString(),
            })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
    },
    // Club operations
    clubs: {
        async findById(id) {
            const { data, error } = await exports.supabase
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
            if (error)
                throw error;
            return data;
        },
        async findMany(filters = {}, pagination = {}) {
            let query = exports.supabase
                .from('clubs')
                .select(`
          *,
          owner:users!owner_id(id, username, full_name, avatar_url)
        `, { count: 'exact' });
            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
            }
            if (filters.visibility) {
                query = query.eq('visibility', filters.visibility);
            }
            // Apply pagination
            const page = pagination.page || 1;
            const limit = pagination.limit || 20;
            const offset = (page - 1) * limit;
            query = query
                .order('member_count', { ascending: false })
                .range(offset, offset + limit - 1);
            const { data, error, count } = await query;
            if (error)
                throw error;
            return {
                data: data || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasNext: page * limit < (count || 0),
                    hasPrev: page > 1,
                },
            };
        },
        async create(clubData) {
            const { data, error } = await exports.supabase
                .from('clubs')
                .insert(clubData)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
    },
    // Comment operations
    comments: {
        async findByPredictionId(predictionId, pagination = {}) {
            const page = pagination.page || 1;
            const limit = pagination.limit || 20;
            const offset = (page - 1) * limit;
            const { data, error, count } = await exports.supabase
                .from('comments')
                .select(`
          *,
          user:users(id, username, full_name, avatar_url)
        `, { count: 'exact' })
                .eq('prediction_id', predictionId)
                .is('parent_comment_id', null)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error)
                throw error;
            return {
                data: data || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasNext: page * limit < (count || 0),
                    hasPrev: page > 1,
                },
            };
        },
        async create(commentData) {
            const { data, error } = await exports.supabase
                .from('comments')
                .insert(commentData)
                .select(`
          *,
          user:users(id, username, full_name, avatar_url)
        `)
                .single();
            if (error)
                throw error;
            return data;
        },
    },
};
exports.default = exports.db;
