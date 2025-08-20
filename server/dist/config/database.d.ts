export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const supabaseAnon: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const db: {
    users: {
        findById(id: string): Promise<any>;
        findByEmail(email: string): Promise<any>;
        create(userData: any): Promise<any>;
        update(id: string, updates: any): Promise<any>;
    };
    predictions: {
        findById(id: string): Promise<any>;
        findMany(filters?: any, pagination?: any): Promise<{
            data: any[];
            pagination: {
                page: any;
                limit: any;
                total: number;
                totalPages: number;
                hasNext: boolean;
                hasPrev: boolean;
            };
        }>;
        create(predictionData: any): Promise<any>;
        update(id: string, updates: any): Promise<any>;
    };
    wallets: {
        findByUserId(userId: string, currency?: string): Promise<any>;
        createOrUpdate(userId: string, currency?: string, updates?: any): Promise<any>;
        updateBalance(userId: string, currency: string, availableChange: number, reservedChange?: number): Promise<any>;
        directUpdateBalance(userId: string, currency: string, availableChange: number, reservedChange?: number): Promise<any>;
    };
    transactions: {
        create(transactionData: any): Promise<any>;
        findByUserId(userId: string, pagination?: any): Promise<{
            data: any[];
            pagination: {
                page: any;
                limit: any;
                total: number;
                totalPages: number;
                hasNext: boolean;
                hasPrev: boolean;
            };
        }>;
        updateStatus(id: string, status: string, updates?: any): Promise<any>;
    };
    clubs: {
        findById(id: string): Promise<any>;
        findMany(filters?: any, pagination?: any): Promise<{
            data: any[];
            pagination: {
                page: any;
                limit: any;
                total: number;
                totalPages: number;
                hasNext: boolean;
                hasPrev: boolean;
            };
        }>;
        create(clubData: any): Promise<any>;
    };
    comments: {
        findByPredictionId(predictionId: string, pagination?: any): Promise<{
            data: any[];
            pagination: {
                page: any;
                limit: any;
                total: number;
                totalPages: number;
                hasNext: boolean;
                hasPrev: boolean;
            };
        }>;
        create(commentData: any): Promise<any>;
    };
};
export default db;
