/**
 * Socket 연결 상태 관리 (Zustand)
 */

import { create } from 'zustand';

interface SocketState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastError: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setError: (error: string | null) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  reconnectAttempts: 0,
  lastError: null,

  setConnected: (connected) =>
    set({ isConnected: connected, lastError: connected ? null : undefined }),

  incrementReconnectAttempts: () =>
    set((state) => ({
      reconnectAttempts: state.reconnectAttempts + 1,
    })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  setError: (error) => set({ lastError: error }),
}));
