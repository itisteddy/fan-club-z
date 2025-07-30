import { create } from 'zustand';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => void;
  register: (email: string, password: string, firstName: string, lastName: string) => void;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true,
  user: {
    id: '1',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex@fanclubz.app',
    avatar: undefined
  },
  login: (email: string, password: string) => {
    // Mock authentication for development
    const user = {
      id: '1',
      firstName: email.split('@')[0], // Use email prefix as first name
      lastName: 'User',
      email: email,
    };
    
    set({ 
      isAuthenticated: true, 
      user 
    });
  },
  register: (email: string, password: string, firstName: string, lastName: string) => {
    // Mock registration for development
    const user = {
      id: Math.random().toString(36).substr(2, 9), // Generate random ID
      firstName: firstName,
      lastName: lastName,
      email: email,
    };
    
    set({ 
      isAuthenticated: true, 
      user 
    });
  },
  logout: () => {
    set({ 
      isAuthenticated: false, 
      user: null 
    });
  },
  updateProfile: async (profileData: any) => {
    // Mock profile update for development
    set((state) => ({
      user: state.user ? {
        ...state.user,
        firstName: profileData.name || state.user.firstName,
      } : null
    }));
  },
}));