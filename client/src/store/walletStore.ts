import { create } from 'zustand';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'prediction' | 'win';
  amount: number;
  description: string;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
}

interface WalletState {
  balance: number;
  transactions: Transaction[];
  addFunds: (amount: number) => void;
  withdraw: (amount: number) => void;
  makePrediction: (amount: number, description: string) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 2500,
  transactions: [],
  addFunds: (amount: number) => {
    set((state) => ({
      balance: state.balance + amount,
      transactions: [
        {
          id: Date.now().toString(),
          type: 'deposit',
          amount,
          description: 'Funds added',
          date: new Date(),
          status: 'completed'
        },
        ...state.transactions
      ]
    }));
  },
  withdraw: (amount: number) => {
    set((state) => ({
      balance: state.balance - amount,
      transactions: [
        {
          id: Date.now().toString(),
          type: 'withdraw',
          amount,
          description: 'Withdrawal',
          date: new Date(),
          status: 'completed'
        },
        ...state.transactions
      ]
    }));
  },
  makePrediction: (amount: number, description: string) => {
    set((state) => ({
      balance: state.balance - amount,
      transactions: [
        {
          id: Date.now().toString(),
          type: 'prediction',
          amount,
          description,
          date: new Date(),
          status: 'completed'
        },
        ...state.transactions
      ]
    }));
  },
}));