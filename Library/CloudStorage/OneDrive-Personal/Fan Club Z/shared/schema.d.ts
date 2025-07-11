export interface User {
    id: string;
    email: string;
    phone: string;
    username: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    walletAddress: string;
    kycLevel: 'none' | 'basic' | 'enhanced';
    walletBalance: number;
    profileImage?: string;
    coverImage?: string;
    bio?: string;
    password?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Bet {
    id: string;
    creatorId: string;
    creator?: User;
    title: string;
    description: string;
    type: 'binary' | 'multi' | 'pool';
    category: 'sports' | 'pop' | 'custom' | 'crypto' | 'politics';
    options: BetOption[];
    status: 'pending' | 'open' | 'closed' | 'settled';
    stakeMin: number;
    stakeMax: number;
    poolTotal: number;
    entryDeadline: string;
    settlementMethod: 'auto' | 'manual';
    isPrivate: boolean;
    password?: string;
    clubId?: string;
    likes: number;
    comments: number;
    shares: number;
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}
export interface BetOption {
    id: string;
    label: string;
    totalStaked: number;
    isWinning?: boolean;
}
export interface BetEntry {
    id: string;
    betId: string;
    bet?: Bet;
    userId: string;
    user?: User;
    optionId: string;
    option?: BetOption;
    amount: number;
    odds: number;
    potentialWinnings: number;
    status: 'active' | 'won' | 'lost' | 'refunded';
    createdAt: string;
    updatedAt: string;
}
export interface Club {
    id: string;
    name: string;
    description: string;
    category: 'sports' | 'pop' | 'crypto' | 'general';
    creatorId: string;
    creator?: User;
    memberCount: number;
    isPrivate: boolean;
    imageUrl?: string;
    coverImage?: string;
    rules?: string;
    createdAt: string;
    updatedAt: string;
}
export interface ClubMember {
    id: string;
    clubId: string;
    userId: string;
    user?: User;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
}
export interface ClubDiscussion {
    id: string;
    clubId: string;
    club?: Club;
    authorId: string;
    author?: User;
    title: string;
    content: string;
    isAnnouncement: boolean;
    isPinned: boolean;
    commentCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface Comment {
    id: string;
    content: string;
    authorId: string;
    author?: User;
    targetType: 'bet' | 'discussion';
    targetId: string;
    likes: number;
    createdAt: string;
    updatedAt: string;
}
export interface Reaction {
    id: string;
    type: 'like' | 'cheer';
    userId: string;
    targetType: 'bet' | 'comment';
    targetId: string;
    createdAt: string;
}
export interface Transaction {
    id: string;
    userId: string;
    type: 'deposit' | 'withdraw' | 'bet_lock' | 'bet_release' | 'transfer';
    currency: 'USD' | 'NGN' | 'USDT' | 'ETH';
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    reference: string;
    description: string;
    fromUserId?: string;
    toUserId?: string;
    betId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Dispute {
    id: string;
    betId: string;
    bet?: Bet;
    userId: string;
    user?: User;
    reason: string;
    status: 'open' | 'resolved' | 'rejected';
    resolution?: string;
    evidenceUrl?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Badge {
    id: string;
    userId: string;
    badgeType: 'first_bet' | 'big_winner' | 'streak_master' | 'social_butterfly' | 'club_creator';
    awardedAt: string;
}
export interface LeaderboardEntry {
    userId: string;
    user?: User;
    score: number;
    rank: number;
    type: 'weekly' | 'monthly' | 'all_time';
}
export interface RegisterRequest {
    email: string;
    phone: string;
    username: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    password: string;
    authProvider?: string;
}
export interface LoginRequest {
    email?: string;
    phone?: string;
    username?: string;
    password: string;
}
export interface AuthResponse {
    token: string;
    user: User;
}
export interface CreateBetRequest {
    title: string;
    description: string;
    type: 'binary' | 'multi' | 'pool';
    category: 'sports' | 'pop' | 'custom' | 'crypto' | 'politics';
    options: Omit<BetOption, 'id' | 'totalStaked'>[];
    stakeMin: number;
    stakeMax: number;
    entryDeadline: string;
    settlementMethod: 'auto' | 'manual';
    isPrivate: boolean;
    password?: string;
    clubId?: string;
    imageUrl?: string;
}
export interface PlaceBetRequest {
    optionId: string;
    amount: number;
}
export interface CreateClubRequest {
    name: string;
    description: string;
    category: 'sports' | 'pop' | 'crypto' | 'general';
    isPrivate: boolean;
    imageUrl?: string;
    rules?: string;
}
export interface CreateDiscussionRequest {
    clubId: string;
    title: string;
    content: string;
    isAnnouncement?: boolean;
}
export interface CreateCommentRequest {
    content: string;
    targetType: 'bet' | 'discussion';
    targetId: string;
}
export interface DepositRequest {
    amount: number;
    currency: 'USD' | 'NGN' | 'USDT' | 'ETH';
    paymentMethod: 'card' | 'bank' | 'crypto';
}
export interface WithdrawRequest {
    amount: number;
    currency: 'USD' | 'NGN' | 'USDT' | 'ETH';
    destination: string;
}
export interface TransferRequest {
    toUserId: string;
    amount: number;
    currency: 'USD' | 'NGN' | 'USDT' | 'ETH';
}
export interface AppState {
    currentUser: User | null;
    isAuthenticated: boolean;
    onboardingCompleted: boolean;
}
export interface BetFilters {
    category?: string;
    status?: string;
    timeframe?: string;
    minStake?: number;
    maxStake?: number;
}
export interface ClubFilters {
    category?: string;
    memberCount?: string;
    isPrivate?: boolean;
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
}
