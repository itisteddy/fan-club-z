// Frontend-specific types adapted from backend schema
export interface PredictionOption {
  id: string;
  label: string;
  totalStaked: number;
  currentOdds?: number;
}

export interface Prediction {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description?: string;
  category: 'sports' | 'pop_culture' | 'custom' | 'esports' | 'celebrity_gossip' | 'politics';
  type: 'binary' | 'multi_outcome' | 'pool';
  status: 'pending' | 'open' | 'closed' | 'settled' | 'disputed' | 'cancelled';
  options: PredictionOption[];
  stakeMin: number;
  stakeMax?: number;
  poolTotal?: number;
  participantCount?: number;
  entryDeadline: Date;
  settlementMethod: 'auto' | 'manual';
  isPrivate?: boolean;
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
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
}