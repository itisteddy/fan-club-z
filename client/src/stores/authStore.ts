import { create } from 'zustand';

// Auth Store
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  updateProfile: (updates: Partial<User>) => void;
  clearError: () => void;
}

// Load user from localStorage if available
const loadStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem('fanclubz_user');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Could not load user data from localStorage:', error);
  }
  
  // Return default user if nothing stored
  return {
    id: '1',
    email: 'alex@example.com',
    firstName: 'Alex',
    lastName: 'Johnson',
    username: 'alex',
    avatar_url: '',
    bio: 'Passionate predictor and sports enthusiast',
    is_verified: true,
    created_at: new Date().toISOString()
  };
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: loadStoredUser(),
  isAuthenticated: true,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock login - in real app this would call the API
      const user = {
        id: '1',
        email,
        firstName: 'Alex',
        lastName: 'Johnson',
        username: email.split('@')[0],
        avatar_url: '',
        bio: 'Passionate predictor and sports enthusiast',
        is_verified: true,
        created_at: new Date().toISOString()
      };
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: 'Login failed', isLoading: false });
    }
  },

  register: async (email: string, password: string, firstName: string, lastName: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock registration - in real app this would call the API
      const user = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        firstName,
        lastName,
        username: email.split('@')[0],
        avatar_url: '',
        bio: '',
        is_verified: false,
        created_at: new Date().toISOString()
      };
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: 'Registration failed', isLoading: false });
    }
  },

  logout: () => {
    // Clear localStorage on logout
    try {
      localStorage.removeItem('fanclubz_user');
    } catch (error) {
      console.warn('Could not clear user data from localStorage:', error);
    }
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  updateProfile: (updates: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      set({ user: updatedUser });
      
      // Persist to localStorage for demo purposes
      try {
        localStorage.setItem('fanclubz_user', JSON.stringify(updatedUser));
      } catch (error) {
        console.warn('Could not save user data to localStorage:', error);
      }
      
      // In a real app, this would sync with the backend
      console.log('Profile updated:', updatedUser);
      
      // Show success notification
      const element = document.createElement('div');
      element.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      element.textContent = 'Profile updated successfully!';
      document.body.appendChild(element);
      setTimeout(() => {
        if (document.body.contains(element)) {
          document.body.removeChild(element);
        }
      }, 3000);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));