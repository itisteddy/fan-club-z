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
  token: string | null;
  login: (email: string, password: string) => void;
  register: (email: string, password: string, firstName: string, lastName: string) => void;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<void>;
  initializeAuth: () => void;
}

// Mock token for development
const MOCK_TOKEN = 'mock-jwt-token-for-development';

// Check if token exists in localStorage on app load
const getStoredToken = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('token');
    return stored || MOCK_TOKEN;
  }
  return MOCK_TOKEN;
};

// Check if user is authenticated on app load
const getStoredUser = () => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
  }
  return {
    id: '1',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex@fanclubz.app',
    avatar: undefined
  };
};

// Initialize with stored data or defaults
const initialUser = getStoredUser();
const initialToken = getStoredToken();

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: !!initialToken,
  user: initialUser,
  token: initialToken,

  initializeAuth: () => {
    const token = getStoredToken();
    const user = getStoredUser();
    
    console.log('Initializing auth with:', { 
      hasToken: !!token, 
      tokenPreview: token ? token.substring(0, 20) + '...' : 'None',
      hasUser: !!user,
      userName: user?.firstName 
    });

    // Ensure token is stored in localStorage
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('token', token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    }

    set({ 
      isAuthenticated: !!token, 
      user,
      token
    });
  },

  login: (email: string, password: string) => {
    // Mock authentication for development
    const user = {
      id: '1',
      firstName: email.split('@')[0], // Use email prefix as first name
      lastName: 'User',
      email: email,
    };
    
    console.log('Logging in user:', user);
    
    // Store token and user data in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', MOCK_TOKEN);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Stored token in localStorage:', MOCK_TOKEN);
    }
    
    set({ 
      isAuthenticated: true, 
      user,
      token: MOCK_TOKEN
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
    
    console.log('Registering user:', user);
    
    // Store token and user data in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', MOCK_TOKEN);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Stored token in localStorage:', MOCK_TOKEN);
    }
    
    set({ 
      isAuthenticated: true, 
      user,
      token: MOCK_TOKEN
    });
  },

  logout: () => {
    console.log('Logging out user');
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    set({ 
      isAuthenticated: false, 
      user: null,
      token: null
    });
  },

  updateProfile: async (profileData: any) => {
    // Mock profile update for development
    set((state) => {
      const updatedUser = state.user ? {
        ...state.user,
        firstName: profileData.name || state.user.firstName,
      } : null;
      
      // Update localStorage
      if (typeof window !== 'undefined' && updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return {
        user: updatedUser
      };
    });
  },
}));

// Initialize auth when the store is created
if (typeof window !== 'undefined') {
  // Delay initialization slightly to ensure localStorage is available
  setTimeout(() => {
    useAuthStore.getState().initializeAuth();
  }, 100);
}