import { create } from 'zustand';

// Main types
export interface Prediction {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  category: string;
  type: 'binary' | 'multi_outcome' | 'pool' | 'multiple';
  status: 'pending' | 'open' | 'closed' | 'settled';
  stakeMin: number;
  stakeMax?: number;
  poolTotal: number;
  entryDeadline: string | Date;
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

// Mock data
const mockPredictions: Prediction[] = [
  {
    id: '1',
    creatorId: 'creator1',
    title: 'Will Bitcoin reach $100k by end of 2025?',
    description: 'With recent market trends and institutional adoption accelerating, what are the chances Bitcoin breaks the psychological $100,000 barrier before 2025 ends?',
    category: 'crypto',
    type: 'binary',
    status: 'open',
    stakeMin: 100,
    stakeMax: 10000,
    poolTotal: 75000,
    entryDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    settlementMethod: 'manual',
    isPrivate: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    participantCount: 23,
    options: [
      { id: '1', label: 'Yes', totalStaked: 48000, currentOdds: 1.56 },
      { id: '2', label: 'No', totalStaked: 27000, currentOdds: 2.78 }
    ]
  },
  {
    id: '2',
    creatorId: 'creator2',
    title: 'Premier League Winner 2024/25 Season',
    description: 'Who will lift the Premier League trophy at the end of the 2024/25 season?',
    category: 'sports',
    type: 'multi_outcome',
    status: 'open',
    stakeMin: 500,
    stakeMax: 50000,
    poolTotal: 125000,
    entryDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    settlementMethod: 'auto',
    isPrivate: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    participantCount: 45,
    options: [
      { id: '3', label: 'Manchester City', totalStaked: 45000, currentOdds: 2.78 },
      { id: '4', label: 'Arsenal', totalStaked: 35000, currentOdds: 3.57 },
      { id: '5', label: 'Liverpool', totalStaked: 25000, currentOdds: 5.0 },
      { id: '6', label: 'Other', totalStaked: 20000, currentOdds: 6.25 }
    ]
  },
  {
    id: '3',
    creatorId: 'creator3',
    title: 'Will Taylor Swift announce new album in 2025?',
    description: 'Based on recent social media activity and industry patterns, will Taylor Swift announce a new studio album during 2025?',
    category: 'entertainment',
    type: 'binary',
    status: 'open',
    stakeMin: 200,
    stakeMax: 5000,
    poolTotal: 32000,
    entryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    settlementMethod: 'manual',
    isPrivate: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    participantCount: 18,
    options: [
      { id: '7', label: 'Yes', totalStaked: 20000, currentOdds: 1.6 },
      { id: '8', label: 'No', totalStaked: 12000, currentOdds: 2.67 }
    ]
  }
];

const mockPredictionEntries: PredictionEntry[] = [
  {
    id: '1',
    predictionId: '1',
    userId: '1',
    optionId: '1',
    amount: 5000,
    potentialPayout: 7800,
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    predictionId: '2',
    userId: '1',
    optionId: '3',
    amount: 3000,
    actualPayout: 8340,
    status: 'won',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Store interface
interface PredictionsState {
  predictions: Prediction[];
  predictionEntries: PredictionEntry[];
  isLoading: boolean;
  error: string | null;
}

interface PredictionsActions {
  fetchPredictions: () => Promise<void>;
  createPrediction: (data: Partial<Prediction>) => Promise<void>;
  placeBet: (predictionId: string, optionId: string, amount: number) => Promise<void>;
  clearError: () => void;
}

export const usePredictionsStore = create<PredictionsState & PredictionsActions>((set, get) => ({
  predictions: mockPredictions,
  predictionEntries: mockPredictionEntries,
  isLoading: false,
  error: null,

  fetchPredictions: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ predictions: mockPredictions, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch predictions', isLoading: false });
    }
  },

  createPrediction: async (data: Partial<Prediction>) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newPrediction: Prediction = {
        id: Date.now().toString(),
        creatorId: '1', // Current user ID
        title: data.title || '',
        description: data.description,
        category: data.category || 'custom',
        type: data.type || 'binary',
        status: 'open',
        stakeMin: data.stakeMin || 100,
        stakeMax: data.stakeMax,
        poolTotal: 0,
        entryDeadline: data.entryDeadline instanceof Date 
          ? data.entryDeadline.toISOString() 
          : data.entryDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        settlementMethod: data.settlementMethod || 'manual',
        isPrivate: data.isPrivate || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participantCount: 0,
        options: data.options || [
          { id: '1', label: 'Yes', totalStaked: 0, currentOdds: 2.0 },
          { id: '2', label: 'No', totalStaked: 0, currentOdds: 2.0 }
        ]
      };

      set(state => ({
        predictions: [newPrediction, ...state.predictions],
        isLoading: false
      }));

      console.log('Prediction created successfully:', newPrediction);
    } catch (error) {
      console.error('Failed to create prediction:', error);
      set({ error: 'Failed to create prediction', isLoading: false });
      throw error;
    }
  },

  placeBet: async (predictionId: string, optionId: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const newEntry: PredictionEntry = {
        id: Date.now().toString(),
        predictionId,
        userId: '1',
        optionId,
        amount,
        potentialPayout: amount * 1.75,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Update prediction pool total and participant count
      const state = get();
      const updatedPredictions = state.predictions.map(prediction => {
        if (prediction.id === predictionId) {
          const updatedOptions = prediction.options.map(option => {
            if (option.id === optionId) {
              return {
                ...option,
                totalStaked: option.totalStaked + amount
              };
            }
            return option;
          });

          return {
            ...prediction,
            poolTotal: prediction.poolTotal + amount,
            participantCount: prediction.participantCount + 1,
            options: updatedOptions,
            updatedAt: new Date().toISOString()
          };
        }
        return prediction;
      });

      set({
        predictionEntries: [newEntry, ...state.predictionEntries],
        predictions: updatedPredictions,
        isLoading: false
      });
    } catch (error) {
      set({ error: 'Failed to place bet', isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));