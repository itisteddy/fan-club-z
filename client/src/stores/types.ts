// Re-export all types for easy importing
export type { User } from './authStore';
export type { Prediction, PredictionOption } from './predictionStore';
export type { PredictionEntry } from './predictionsStore';

// Additional types for the components
export interface Prediction {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  category: string;
  type: 'binary' | 'multi_outcome' | 'pool';
  status: 'pending' | 'open' | 'closed' | 'settled';
  stakeMin: number;
  stakeMax?: number;
  poolTotal: number;
  entryDeadline: string;
  settlementMethod: 'auto' | 'manual';
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  options: PredictionOption[];
  participantCount: number;
}

export interface PredictionOption {
  id: string;
  label: string;
  totalStaked: number;
  currentOdds: number;
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
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  createdAt: string;
}