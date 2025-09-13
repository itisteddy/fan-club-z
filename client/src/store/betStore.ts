import { create } from 'zustand';
import { PredictionEntry } from '@fanclubz/shared';

export interface Bet {
  id: string;
  predictionId: string;
  optionId: string;
  amount: number;
  potentialPayout: number;
  status: 'active' | 'won' | 'lost' | 'cancelled';
  createdAt: string;
}

interface BetState {
  bets: Bet[];
  loading: boolean;
  error: string | null;
}

interface BetActions {
  setBets: (bets: Bet[]) => void;
  addBet: (bet: Bet) => void;
  updateBet: (id: string, updates: Partial<Bet>) => void;
  removeBet: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBetStore = create<BetState & BetActions>((set, get) => ({
  // State
  bets: [],
  loading: false,
  error: null,

  // Actions
  setBets: (bets) => set({ bets }),
  
  addBet: (bet) => set((state) => ({ 
    bets: [...state.bets, bet] 
  })),
  
  updateBet: (id, updates) => set((state) => ({
    bets: state.bets.map(bet => 
      bet.id === id ? { ...bet, ...updates } : bet
    )
  })),
  
  removeBet: (id) => set((state) => ({
    bets: state.bets.filter(bet => bet.id !== id)
  })),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
