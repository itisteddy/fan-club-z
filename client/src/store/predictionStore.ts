import { create } from 'zustand';
import { Prediction } from '../../shared/src/schemas';

interface PredictionState {
  predictions: Prediction[];
  loading: boolean;
  error: string | null;
  createPrediction: (prediction: Omit<Prediction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  makePrediction: (predictionId: string, optionId: string, amount: number) => void;
}

// Mock data for development
const mockPredictions: Prediction[] = [
  {
    id: '1',
    title: 'Will Bitcoin reach $100K by end of 2025?',
    description: 'Prediction on Bitcoin price reaching $100,000 by December 31st, 2025',
    category: 'crypto',
    type: 'binary',
    status: 'open',
    creatorId: '1',
    creatorName: 'Alex Johnson',
    options: [
      {
        id: '1a',
        label: 'Yes, it will reach $100K',
        totalStaked: 15000
      },
      {
        id: '1b', 
        label: 'No, it will stay below $100K',
        totalStaked: 8500
      }
    ],
    stakeMin: 10,
    stakeMax: 1000,
    entryDeadline: new Date('2025-12-30'),
    settlementMethod: 'manual',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    title: 'Premier League: Man City vs Arsenal - Who wins?',
    description: 'Premier League match prediction',
    category: 'sports',
    type: 'multi',
    status: 'open',
    creatorId: '2',
    creatorName: 'Sarah Sports',
    options: [
      {
        id: '2a',
        label: 'Man City wins',
        totalStaked: 12000
      },
      {
        id: '2b',
        label: 'Arsenal wins', 
        totalStaked: 8000
      },
      {
        id: '2c',
        label: 'Draw',
        totalStaked: 5000
      }
    ],
    stakeMin: 5,
    stakeMax: 500,
    entryDeadline: new Date('2025-08-15'),
    settlementMethod: 'auto',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    title: 'Taylor Swift announces surprise album in 2025?',
    description: 'Will Taylor Swift surprise fans with an unannounced album release in 2025?',
    category: 'pop',
    type: 'binary',
    status: 'open',
    creatorId: '3',
    creatorName: 'Pop Culture Mike',
    options: [
      {
        id: '3a',
        label: 'Yes, surprise album',
        totalStaked: 6000
      },
      {
        id: '3b',
        label: 'No surprise album',
        totalStaked: 4000
      }
    ],
    stakeMin: 1,
    stakeMax: 200,
    entryDeadline: new Date('2025-12-31'),
    settlementMethod: 'manual',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const usePredictionStore = create<PredictionState>((set, get) => ({
  predictions: mockPredictions,
  loading: false,
  error: null,
  createPrediction: (predictionData) => {
    const newPrediction: Prediction = {
      ...predictionData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      options: predictionData.options || []
    };
    
    set((state) => ({
      predictions: [newPrediction, ...state.predictions]
    }));
  },
  makePrediction: (predictionId: string, optionId: string, amount: number) => {
    set((state) => ({
      predictions: state.predictions.map(prediction => 
        prediction.id === predictionId 
          ? {
              ...prediction,
              options: prediction.options.map(option =>
                option.id === optionId
                  ? { ...option, totalStaked: option.totalStaked + amount }
                  : option
              )
            }
          : prediction
      )
    }));
  }
}));