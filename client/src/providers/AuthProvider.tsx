import React, { createContext, useContext, useState } from 'react';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: false,
    isAuthenticated: true, // Set to true to skip auth for now
  });

  const login = async (email: string, password: string) => {
    // Real authentication would be implemented here
    throw new Error('Authentication system not implemented');
  };

  const register = async (email: string, password: string, username: string) => {
    // Real registration would be implemented here
    throw new Error('Registration system not implemented');
  };

  const logout = () => {
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const refreshUser = async () => {
    // Demo refresh - no-op
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};