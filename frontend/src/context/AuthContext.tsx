import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/api/client';

export interface UserSession {
  apiKey: string;
  name: string;
  role: string;
  avatarSeed?: string;
}

export interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  loginWithApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_API_KEY = 'calm_live_demo_key_99x';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // RULE 5: Keep auth tokens in memory or an httpOnly cookie, NOT localStorage!
  const [user, setUser] = useState<UserSession | null>(null);

  const loginWithApiKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      return { success: false, error: 'API key is required' };
    }
    if (trimmed.length < 8) {
      return { success: false, error: 'API key must be at least 8 characters' };
    }

    // Demo or valid format simulation
    const name = trimmed === DEMO_API_KEY ? 'Demo Engineer' : 'Team Lead';
    setUser({
      apiKey: trimmed,
      name,
      role: 'admin',
      avatarSeed: trimmed.slice(0, 4),
    });

    // Update API client auth token for server requests
    apiClient.setAuthToken(trimmed);

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    apiClient.setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loginWithApiKey,
      logout,
    }),
    [user, loginWithApiKey, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
