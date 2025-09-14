export interface User {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    email?: string;
    created_at?: string;
    updated_at?: string;
    is_verified?: boolean;
    displayName?: string;
    avatarUrl?: string;
    reputation?: number;
    walletCurrency?: 'USD' | 'NGN' | 'USDC' | string;
}
export interface Prediction {
    id: string;
    title: string;
    description?: string;
    category?: string;
    status: 'active' | 'settled' | 'cancelled';
    created_at: string;
    updated_at: string;
    created_by: string;
    settlement_date?: string;
    options: PredictionOption[];
}
export interface PredictionOption {
    id: string;
    prediction_id: string;
    title: string;
    description?: string;
    odds: number;
    created_at: string;
}
export interface PredictionEntry {
    id: string;
    prediction_id: string;
    option_id: string;
    user_id: string;
    amount: number;
    potential_payout: number;
    created_at: string;
    status: 'active' | 'won' | 'lost' | 'cancelled';
}
export interface Comment {
    id: string;
    prediction_id: string;
    user_id: string;
    content: string;
    parent_id?: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        username?: string;
        full_name?: string;
        avatar_url?: string;
    };
    replies_count?: number;
    is_liked?: boolean;
    likes_count?: number;
}
export interface Settlement {
    id: string;
    prediction_id: string;
    winning_option_id: string;
    settled_by: string;
    settlement_reason: string;
    created_at: string;
    status: 'pending' | 'completed' | 'disputed';
}
export interface SettlementConfig {
    id: string;
    prediction_id: string;
    source_type: 'manual' | 'api' | 'automated';
    source_url?: string;
    source_selector?: string;
    created_at: string;
    updated_at: string;
}
export interface SettlementProof {
    id: string;
    settlement_id: string;
    proof_type: 'url' | 'text' | 'image';
    proof_value: string;
    created_at: string;
}
export interface SettlementSource {
    id: string;
    name: string;
    type: 'manual' | 'api' | 'automated';
    url?: string;
    selector?: string;
    created_at: string;
}
export interface Dispute {
    id: string;
    settlement_id: string;
    disputed_by: string;
    dispute_reason: string;
    status: 'open' | 'resolved' | 'dismissed';
    created_at: string;
    resolved_at?: string;
    resolved_by?: string;
}
