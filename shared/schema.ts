// Fan Club Z Shared Schema Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  walletAddress?: string;
  kycLevel: 'none' | 'basic' | 'enhanced';
  reputationScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionOption {
  id: string;
  label: string;
  totalStaked: number;
}

export interface Prediction {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'binary' | 'multi' | 'pool';
  status: 'pending' | 'open' | 'closed' | 'settled';
  creatorId: string;
  creatorName?: string;
  options: PredictionOption[];
  stakeMin: number;
  stakeMax?: number;
  entryDeadline: Date;
  settlementMethod: 'auto' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionEntry {
  id: string;
  predictionId: string;
  userId: string;
  optionId: string;
  amount: number;
  potentialPayout?: number;
  actualPayout?: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  visibility: 'public' | 'private' | 'invite_only';
  memberCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubMember {
  clubId: string;
  userId: string;
  role: 'member' | 'admin';
  joinedAt: Date;
}

export interface Comment {
  id: string;
  predictionId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface Reaction {
  id: string;
  predictionId: string;
  userId: string;
  type: 'like' | 'cheer';
  createdAt: Date;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'prediction_lock' | 'prediction_release' | 'transfer';
  currency: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  createdAt: Date;
}

// Legacy support for transition period
export type Bet = Prediction;
export type BetOption = PredictionOption;
export type BetEntry = PredictionEntry;