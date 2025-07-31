import { z } from 'zod';
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    full_name: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodOptional<z.ZodString>;
    wallet_address: z.ZodOptional<z.ZodString>;
    kyc_level: z.ZodDefault<z.ZodEnum<["none", "basic", "enhanced"]>>;
    kyc_status: z.ZodDefault<z.ZodEnum<["pending", "submitted", "under_review", "approved", "rejected"]>>;
    auth_provider: z.ZodOptional<z.ZodEnum<["email", "google", "apple"]>>;
    two_fa_enabled: z.ZodDefault<z.ZodBoolean>;
    reputation_score: z.ZodDefault<z.ZodNumber>;
    is_verified: z.ZodDefault<z.ZodBoolean>;
    is_active: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    id: string;
    is_active: boolean;
    is_verified: boolean;
    kyc_level: "none" | "basic" | "enhanced";
    created_at: string;
    updated_at: string;
    kyc_status: "pending" | "submitted" | "under_review" | "approved" | "rejected";
    two_fa_enabled: boolean;
    reputation_score: number;
    username?: string | undefined;
    full_name?: string | undefined;
    avatar_url?: string | undefined;
    phone?: string | undefined;
    auth_provider?: "email" | "google" | "apple" | undefined;
    wallet_address?: string | undefined;
}, {
    email: string;
    id: string;
    created_at: string;
    updated_at: string;
    username?: string | undefined;
    is_active?: boolean | undefined;
    is_verified?: boolean | undefined;
    kyc_level?: "none" | "basic" | "enhanced" | undefined;
    full_name?: string | undefined;
    avatar_url?: string | undefined;
    phone?: string | undefined;
    auth_provider?: "email" | "google" | "apple" | undefined;
    wallet_address?: string | undefined;
    kyc_status?: "pending" | "submitted" | "under_review" | "approved" | "rejected" | undefined;
    two_fa_enabled?: boolean | undefined;
    reputation_score?: number | undefined;
}>;
export declare const RegisterUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    full_name: z.ZodOptional<z.ZodString>;
    auth_provider: z.ZodDefault<z.ZodEnum<["email", "google", "apple"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    auth_provider: "email" | "google" | "apple";
    username?: string | undefined;
    full_name?: string | undefined;
    phone?: string | undefined;
}, {
    email: string;
    password: string;
    username?: string | undefined;
    full_name?: string | undefined;
    phone?: string | undefined;
    auth_provider?: "email" | "google" | "apple" | undefined;
}>;
export declare const LoginUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const UpdateUserSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    full_name: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    full_name?: string | undefined;
    avatar_url?: string | undefined;
    phone?: string | undefined;
}, {
    username?: string | undefined;
    full_name?: string | undefined;
    avatar_url?: string | undefined;
    phone?: string | undefined;
}>;
export declare const PredictionOptionSchema: z.ZodObject<{
    id: z.ZodString;
    prediction_id: z.ZodString;
    label: z.ZodString;
    total_staked: z.ZodDefault<z.ZodNumber>;
    current_odds: z.ZodDefault<z.ZodNumber>;
    is_winning_outcome: z.ZodOptional<z.ZodBoolean>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    updated_at: string;
    prediction_id: string;
    label: string;
    total_staked: number;
    current_odds: number;
    is_winning_outcome?: boolean | undefined;
}, {
    id: string;
    created_at: string;
    updated_at: string;
    prediction_id: string;
    label: string;
    total_staked?: number | undefined;
    current_odds?: number | undefined;
    is_winning_outcome?: boolean | undefined;
}>;
export declare const PredictionSchema: z.ZodObject<{
    id: z.ZodString;
    creator_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["sports", "pop_culture", "custom", "esports", "celebrity_gossip", "politics"]>;
    type: z.ZodEnum<["binary", "multi_outcome", "pool"]>;
    status: z.ZodDefault<z.ZodEnum<["pending", "open", "closed", "settled", "disputed", "cancelled"]>>;
    stake_min: z.ZodNumber;
    stake_max: z.ZodOptional<z.ZodNumber>;
    pool_total: z.ZodDefault<z.ZodNumber>;
    entry_deadline: z.ZodString;
    settlement_method: z.ZodEnum<["auto", "manual"]>;
    settlement_proof_url: z.ZodOptional<z.ZodString>;
    settled_outcome_id: z.ZodOptional<z.ZodString>;
    is_private: z.ZodDefault<z.ZodBoolean>;
    password_hash: z.ZodOptional<z.ZodString>;
    creator_fee_percentage: z.ZodDefault<z.ZodNumber>;
    platform_fee_percentage: z.ZodDefault<z.ZodNumber>;
    club_id: z.ZodOptional<z.ZodString>;
    sponsor_id: z.ZodOptional<z.ZodString>;
    image_url: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    updated_at: string;
    type: "binary" | "multi_outcome" | "pool";
    creator_id: string;
    category: "sports" | "pop_culture" | "custom" | "esports" | "celebrity_gossip" | "politics";
    status: "pending" | "open" | "closed" | "settled" | "disputed" | "cancelled";
    pool_total: number;
    title: string;
    stake_min: number;
    entry_deadline: string;
    settlement_method: "auto" | "manual";
    is_private: boolean;
    creator_fee_percentage: number;
    platform_fee_percentage: number;
    tags: string[];
    club_id?: string | undefined;
    password_hash?: string | undefined;
    description?: string | undefined;
    stake_max?: number | undefined;
    settlement_proof_url?: string | undefined;
    settled_outcome_id?: string | undefined;
    sponsor_id?: string | undefined;
    image_url?: string | undefined;
}, {
    id: string;
    created_at: string;
    updated_at: string;
    type: "binary" | "multi_outcome" | "pool";
    creator_id: string;
    category: "sports" | "pop_culture" | "custom" | "esports" | "celebrity_gossip" | "politics";
    title: string;
    stake_min: number;
    entry_deadline: string;
    settlement_method: "auto" | "manual";
    status?: "pending" | "open" | "closed" | "settled" | "disputed" | "cancelled" | undefined;
    club_id?: string | undefined;
    password_hash?: string | undefined;
    pool_total?: number | undefined;
    description?: string | undefined;
    stake_max?: number | undefined;
    settlement_proof_url?: string | undefined;
    settled_outcome_id?: string | undefined;
    is_private?: boolean | undefined;
    creator_fee_percentage?: number | undefined;
    platform_fee_percentage?: number | undefined;
    sponsor_id?: string | undefined;
    image_url?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare const CreatePredictionSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["sports", "pop_culture", "custom", "esports", "celebrity_gossip", "politics"]>;
    type: z.ZodEnum<["binary", "multi_outcome", "pool"]>;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
    }, {
        label: string;
    }>, "many">;
    stake_min: z.ZodNumber;
    stake_max: z.ZodOptional<z.ZodNumber>;
    entry_deadline: z.ZodString;
    settlement_method: z.ZodEnum<["auto", "manual"]>;
    is_private: z.ZodDefault<z.ZodBoolean>;
    password: z.ZodOptional<z.ZodString>;
    creator_fee_percentage: z.ZodDefault<z.ZodNumber>;
    club_id: z.ZodOptional<z.ZodString>;
    image_url: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "binary" | "multi_outcome" | "pool";
    options: {
        label: string;
    }[];
    category: "sports" | "pop_culture" | "custom" | "esports" | "celebrity_gossip" | "politics";
    title: string;
    stake_min: number;
    entry_deadline: string;
    settlement_method: "auto" | "manual";
    is_private: boolean;
    creator_fee_percentage: number;
    tags: string[];
    club_id?: string | undefined;
    password?: string | undefined;
    description?: string | undefined;
    stake_max?: number | undefined;
    image_url?: string | undefined;
}, {
    type: "binary" | "multi_outcome" | "pool";
    options: {
        label: string;
    }[];
    category: "sports" | "pop_culture" | "custom" | "esports" | "celebrity_gossip" | "politics";
    title: string;
    stake_min: number;
    entry_deadline: string;
    settlement_method: "auto" | "manual";
    club_id?: string | undefined;
    password?: string | undefined;
    description?: string | undefined;
    stake_max?: number | undefined;
    is_private?: boolean | undefined;
    creator_fee_percentage?: number | undefined;
    image_url?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare const UpdatePredictionSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    entry_deadline: z.ZodOptional<z.ZodString>;
    settlement_proof_url: z.ZodOptional<z.ZodString>;
    image_url: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    entry_deadline?: string | undefined;
    settlement_proof_url?: string | undefined;
    image_url?: string | undefined;
    tags?: string[] | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    entry_deadline?: string | undefined;
    settlement_proof_url?: string | undefined;
    image_url?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare const PredictionEntrySchema: z.ZodObject<{
    id: z.ZodString;
    prediction_id: z.ZodString;
    user_id: z.ZodString;
    option_id: z.ZodString;
    amount: z.ZodNumber;
    potential_payout: z.ZodOptional<z.ZodNumber>;
    actual_payout: z.ZodOptional<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["active", "won", "lost", "refunded"]>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    updated_at: string;
    status: "active" | "won" | "lost" | "refunded";
    user_id: string;
    prediction_id: string;
    option_id: string;
    amount: number;
    potential_payout?: number | undefined;
    actual_payout?: number | undefined;
}, {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    prediction_id: string;
    option_id: string;
    amount: number;
    status?: "active" | "won" | "lost" | "refunded" | undefined;
    potential_payout?: number | undefined;
    actual_payout?: number | undefined;
}>;
export declare const CreatePredictionEntrySchema: z.ZodObject<{
    prediction_id: z.ZodString;
    option_id: z.ZodString;
    amount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    prediction_id: string;
    option_id: string;
    amount: number;
}, {
    prediction_id: string;
    option_id: string;
    amount: number;
}>;
export declare const WalletSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    currency: z.ZodDefault<z.ZodEnum<["NGN", "USD", "USDT", "ETH"]>>;
    available_balance: z.ZodDefault<z.ZodNumber>;
    reserved_balance: z.ZodDefault<z.ZodNumber>;
    total_deposited: z.ZodDefault<z.ZodNumber>;
    total_withdrawn: z.ZodDefault<z.ZodNumber>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: "NGN" | "USD" | "USDT" | "ETH";
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    available_balance: number;
    reserved_balance: number;
    total_deposited: number;
    total_withdrawn: number;
}, {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    currency?: "NGN" | "USD" | "USDT" | "ETH" | undefined;
    available_balance?: number | undefined;
    reserved_balance?: number | undefined;
    total_deposited?: number | undefined;
    total_withdrawn?: number | undefined;
}>;
export declare const WalletTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    type: z.ZodEnum<["deposit", "withdraw", "prediction_lock", "prediction_release", "transfer_in", "transfer_out", "fee", "creator_payout"]>;
    currency: z.ZodDefault<z.ZodEnum<["NGN", "USD", "USDT", "ETH"]>>;
    amount: z.ZodNumber;
    status: z.ZodDefault<z.ZodEnum<["pending", "completed", "failed", "reversed"]>>;
    reference: z.ZodOptional<z.ZodString>;
    related_prediction_entry_id: z.ZodOptional<z.ZodString>;
    related_payout_id: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: "NGN" | "USD" | "USDT" | "ETH";
    id: string;
    created_at: string;
    updated_at: string;
    type: "prediction_lock" | "deposit" | "withdraw" | "prediction_release" | "transfer_in" | "transfer_out" | "fee" | "creator_payout";
    status: "pending" | "completed" | "failed" | "reversed";
    user_id: string;
    amount: number;
    description?: string | undefined;
    reference?: string | undefined;
    related_prediction_entry_id?: string | undefined;
    related_payout_id?: string | undefined;
}, {
    id: string;
    created_at: string;
    updated_at: string;
    type: "prediction_lock" | "deposit" | "withdraw" | "prediction_release" | "transfer_in" | "transfer_out" | "fee" | "creator_payout";
    user_id: string;
    amount: number;
    currency?: "NGN" | "USD" | "USDT" | "ETH" | undefined;
    status?: "pending" | "completed" | "failed" | "reversed" | undefined;
    description?: string | undefined;
    reference?: string | undefined;
    related_prediction_entry_id?: string | undefined;
    related_payout_id?: string | undefined;
}>;
export declare const DepositSchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodEnum<["NGN", "USD", "USDT", "ETH"]>>;
    payment_method: z.ZodDefault<z.ZodEnum<["card", "bank_transfer", "crypto"]>>;
}, "strip", z.ZodTypeAny, {
    currency: "NGN" | "USD" | "USDT" | "ETH";
    amount: number;
    payment_method: "card" | "bank_transfer" | "crypto";
}, {
    amount: number;
    currency?: "NGN" | "USD" | "USDT" | "ETH" | undefined;
    payment_method?: "card" | "bank_transfer" | "crypto" | undefined;
}>;
export declare const WithdrawSchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodEnum<["NGN", "USD", "USDT", "ETH"]>>;
    destination: z.ZodString;
    withdrawal_method: z.ZodDefault<z.ZodEnum<["bank_transfer", "crypto"]>>;
}, "strip", z.ZodTypeAny, {
    currency: "NGN" | "USD" | "USDT" | "ETH";
    amount: number;
    destination: string;
    withdrawal_method: "bank_transfer" | "crypto";
}, {
    amount: number;
    destination: string;
    currency?: "NGN" | "USD" | "USDT" | "ETH" | undefined;
    withdrawal_method?: "bank_transfer" | "crypto" | undefined;
}>;
export declare const CommentSchema: z.ZodObject<{
    id: z.ZodString;
    prediction_id: z.ZodString;
    user_id: z.ZodString;
    content: z.ZodString;
    parent_comment_id: z.ZodOptional<z.ZodString>;
    is_edited: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    prediction_id: string;
    content: string;
    is_edited: boolean;
    parent_comment_id?: string | undefined;
}, {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    prediction_id: string;
    content: string;
    parent_comment_id?: string | undefined;
    is_edited?: boolean | undefined;
}>;
export declare const CreateCommentSchema: z.ZodObject<{
    prediction_id: z.ZodString;
    content: z.ZodString;
    parent_comment_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prediction_id: string;
    content: string;
    parent_comment_id?: string | undefined;
}, {
    prediction_id: string;
    content: string;
    parent_comment_id?: string | undefined;
}>;
export declare const ReactionSchema: z.ZodObject<{
    id: z.ZodString;
    prediction_id: z.ZodString;
    user_id: z.ZodString;
    type: z.ZodEnum<["like", "cheer", "fire", "thinking"]>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    type: "like" | "cheer" | "fire" | "thinking";
    user_id: string;
    prediction_id: string;
}, {
    id: string;
    created_at: string;
    type: "like" | "cheer" | "fire" | "thinking";
    user_id: string;
    prediction_id: string;
}>;
export declare const CreateReactionSchema: z.ZodObject<{
    prediction_id: z.ZodString;
    type: z.ZodEnum<["like", "cheer", "fire", "thinking"]>;
}, "strip", z.ZodTypeAny, {
    type: "like" | "cheer" | "fire" | "thinking";
    prediction_id: string;
}, {
    type: "like" | "cheer" | "fire" | "thinking";
    prediction_id: string;
}>;
export declare const ClubSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    owner_id: z.ZodString;
    visibility: z.ZodDefault<z.ZodEnum<["public", "private", "invite_only"]>>;
    member_count: z.ZodDefault<z.ZodNumber>;
    avatar_url: z.ZodOptional<z.ZodString>;
    cover_url: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    rules: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    owner_id: string;
    visibility: "public" | "private" | "invite_only";
    member_count: number;
    tags: string[];
    rules: string[];
    avatar_url?: string | undefined;
    description?: string | undefined;
    cover_url?: string | undefined;
}, {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    owner_id: string;
    avatar_url?: string | undefined;
    visibility?: "public" | "private" | "invite_only" | undefined;
    member_count?: number | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    cover_url?: string | undefined;
    rules?: string[] | undefined;
}>;
export declare const CreateClubSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    visibility: z.ZodDefault<z.ZodEnum<["public", "private", "invite_only"]>>;
    avatar_url: z.ZodOptional<z.ZodString>;
    cover_url: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    rules: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    visibility: "public" | "private" | "invite_only";
    tags: string[];
    rules: string[];
    avatar_url?: string | undefined;
    description?: string | undefined;
    cover_url?: string | undefined;
}, {
    name: string;
    avatar_url?: string | undefined;
    visibility?: "public" | "private" | "invite_only" | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    cover_url?: string | undefined;
    rules?: string[] | undefined;
}>;
export declare const ClubMemberSchema: z.ZodObject<{
    id: z.ZodString;
    club_id: z.ZodString;
    user_id: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["member", "moderator", "admin"]>>;
    joined_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    updated_at: string;
    club_id: string;
    user_id: string;
    role: "admin" | "moderator" | "member";
    joined_at: string;
}, {
    id: string;
    updated_at: string;
    club_id: string;
    user_id: string;
    joined_at: string;
    role?: "admin" | "moderator" | "member" | undefined;
}>;
export declare const NotificationSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    type: z.ZodEnum<["prediction_settled", "prediction_ending", "comment_reply", "club_invite", "payment_received", "system_announcement"]>;
    title: z.ZodString;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    is_read: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    id: string;
    created_at: string;
    updated_at: string;
    type: "prediction_settled" | "prediction_ending" | "comment_reply" | "club_invite" | "payment_received" | "system_announcement";
    user_id: string;
    title: string;
    is_read: boolean;
    data?: Record<string, any> | undefined;
}, {
    message: string;
    id: string;
    created_at: string;
    updated_at: string;
    type: "prediction_settled" | "prediction_ending" | "comment_reply" | "club_invite" | "payment_received" | "system_announcement";
    user_id: string;
    title: string;
    data?: Record<string, any> | undefined;
    is_read?: boolean | undefined;
}>;
export declare const ApiResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodString>;
    errors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: any;
    errors?: Record<string, string[]> | undefined;
}, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: any;
    errors?: Record<string, string[]> | undefined;
}>;
export declare const PaginatedResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodArray<z.ZodAny, "many">;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: any[];
    pagination: {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}, {
    success: boolean;
    data: any[];
    pagination: {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}>;
export declare const PaginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
}, {
    limit?: number | undefined;
    page?: number | undefined;
}>;
export declare const PredictionQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
} & {
    category: z.ZodOptional<z.ZodEnum<["sports", "pop_culture", "custom", "esports", "celebrity_gossip", "politics"]>>;
    status: z.ZodOptional<z.ZodEnum<["pending", "open", "closed", "settled", "disputed", "cancelled"]>>;
    creator_id: z.ZodOptional<z.ZodString>;
    club_id: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    sort: z.ZodDefault<z.ZodEnum<["created_at", "pool_total", "entry_deadline"]>>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sort: "created_at" | "pool_total" | "entry_deadline";
    limit: number;
    page: number;
    order: "desc" | "asc";
    search?: string | undefined;
    creator_id?: string | undefined;
    category?: "sports" | "pop_culture" | "custom" | "esports" | "celebrity_gossip" | "politics" | undefined;
    status?: "pending" | "open" | "closed" | "settled" | "disputed" | "cancelled" | undefined;
    club_id?: string | undefined;
}, {
    sort?: "created_at" | "pool_total" | "entry_deadline" | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    creator_id?: string | undefined;
    category?: "sports" | "pop_culture" | "custom" | "esports" | "celebrity_gossip" | "politics" | undefined;
    status?: "pending" | "open" | "closed" | "settled" | "disputed" | "cancelled" | undefined;
    club_id?: string | undefined;
    page?: number | undefined;
    order?: "desc" | "asc" | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type PredictionOption = z.infer<typeof PredictionOptionSchema>;
export type CreatePrediction = z.infer<typeof CreatePredictionSchema>;
export type UpdatePrediction = z.infer<typeof UpdatePredictionSchema>;
export type PredictionEntry = z.infer<typeof PredictionEntrySchema>;
export type CreatePredictionEntry = z.infer<typeof CreatePredictionEntrySchema>;
export type Wallet = z.infer<typeof WalletSchema>;
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;
export type Deposit = z.infer<typeof DepositSchema>;
export type Withdraw = z.infer<typeof WithdrawSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
export type Reaction = z.infer<typeof ReactionSchema>;
export type CreateReaction = z.infer<typeof CreateReactionSchema>;
export type Club = z.infer<typeof ClubSchema>;
export type CreateClub = z.infer<typeof CreateClubSchema>;
export type ClubMember = z.infer<typeof ClubMemberSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type ApiResponse<T = any> = {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    errors?: Record<string, string[]>;
};
export type PaginatedResponse<T = any> = {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
};
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PredictionQuery = z.infer<typeof PredictionQuerySchema>;
export declare const PREDICTION_CATEGORIES: readonly ["sports", "pop_culture", "custom", "esports", "celebrity_gossip", "politics"];
export declare const PREDICTION_TYPES: readonly ["binary", "multi_outcome", "pool"];
export declare const PREDICTION_STATUSES: readonly ["pending", "open", "closed", "settled", "disputed", "cancelled"];
export declare const WALLET_CURRENCIES: readonly ["NGN", "USD", "USDT", "ETH"];
export declare const TRANSACTION_TYPES: readonly ["deposit", "withdraw", "prediction_lock", "prediction_release", "transfer_in", "transfer_out", "fee", "creator_payout"];
export declare const REACTION_TYPES: readonly ["like", "cheer", "fire", "thinking"];
export declare const CLUB_ROLES: readonly ["member", "moderator", "admin"];
export declare const CLUB_VISIBILITY: readonly ["public", "private", "invite_only"];
