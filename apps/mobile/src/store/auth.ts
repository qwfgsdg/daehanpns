/**
 * 인증 상태 관리 (Zustand)
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '@/types';
import { TOKEN_KEYS } from '@/constants';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setToken: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  setToken: async (accessToken) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
      set({ accessToken, isAuthenticated: true });
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
      if (token) {
        set({ accessToken: token, isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Failed to check auth:', error);
      set({ isLoading: false });
      return false;
    }
  },

  updateUser: (updates) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });
    }
  },
}));
