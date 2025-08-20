export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export type KeysOfUnion<T> = T extends T ? keyof T : never;
export interface DatabaseUser {
    id: string;
    email: string;
    phone?: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    wallet_address?: string;
    kyc_level: 'none' | 'basic' | 'enhanced';
    kyc_status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
    auth_provider?: 'email' | 'google' | 'apple';
    two_fa_enabled: boolean;
    reputation_score: number;
    is_verified: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface DatabasePrediction {
    id: string;
    creator_id: string;
    title: string;
    description?: string;
    category: 'sports' | 'pop_culture' | 'custom' | 'esports' | 'celebrity_gossip' | 'politics';
    type: 'binary' | 'multi_outcome' | 'pool';
    status: 'pending' | 'open' | 'closed' | 'settled' | 'disputed' | 'cancelled';
    stake_min: number;
    stake_max?: number;
    pool_total: number;
    entry_deadline: string;
    settlement_method: 'auto' | 'manual';
    settlement_proof_url?: string;
    settled_outcome_id?: string;
    is_private: boolean;
    password_hash?: string;
    creator_fee_percentage: number;
    platform_fee_percentage: number;
    club_id?: string;
    sponsor_id?: string;
    image_url?: string;
    tags: string[];
    created_at: string;
    updated_at: string;
}
export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: 'Bearer';
}
export interface LoginResponse {
    user: DatabaseUser;
    tokens: AuthTokens;
}
export interface RefreshTokenResponse {
    tokens: AuthTokens;
}
export interface WebSocketMessage {
    type: string;
    payload: any;
    timestamp: number;
}
export interface PredictionUpdateMessage extends WebSocketMessage {
    type: 'prediction_update';
    payload: {
        prediction_id: string;
        pool_total: number;
        options: Array<{
            id: string;
            total_staked: number;
            current_odds: number;
        }>;
    };
}
export interface CommentMessage extends WebSocketMessage {
    type: 'new_comment';
    payload: {
        prediction_id: string;
        comment: {
            id: string;
            user_id: string;
            content: string;
            created_at: string;
            user: {
                username: string;
                avatar_url?: string;
            };
        };
    };
}
export interface ReactionMessage extends WebSocketMessage {
    type: 'new_reaction';
    payload: {
        prediction_id: string;
        reaction: {
            id: string;
            user_id: string;
            type: string;
            created_at: string;
        };
    };
}
export declare const formatCurrency: (amount: number, currency?: string) => string;
export declare const formatDate: (dateString: string) => string;
export declare const formatTimeRemaining: (dateString: string) => string;
export declare const calculateOdds: (totalPool: number, optionStaked: number) => number;
export declare const calculatePotentialPayout: (stake: number, odds: number) => number;
export declare const slugify: (text: string) => string;
export declare const truncateText: (text: string, maxLength?: number) => string;
export declare const isValidEmail: (email: string) => boolean;
export declare const isValidPassword: (password: string) => boolean;
export declare const generateInitials: (name?: string) => string;
export declare const getAvatarUrl: (user: {
    avatar_url?: string;
    username?: string;
    full_name?: string;
}) => string;
export declare const validatePredictionDeadline: (deadline: string) => boolean;
export declare const validatePredictionStakeRange: (stakeMin: number, stakeMax?: number) => boolean;
export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    details?: any | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined, details?: any | undefined);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
