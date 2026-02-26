/**
 * UI 상태 관리 (Zustand)
 */

import { create } from 'zustand';

interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ModalData {
  id: string;
  title?: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UIState {
  isLoading: boolean;
  loadingMessage: string | null;
  toasts: ToastData[];
  modal: ModalData | null;

  // Actions
  showLoading: (message?: string) => void;
  hideLoading: () => void;

  showToast: (
    message: string,
    type?: ToastData['type'],
    duration?: number
  ) => void;
  hideToast: (id: string) => void;

  showModal: (data: Omit<ModalData, 'id'>) => void;
  hideModal: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isLoading: false,
  loadingMessage: null,
  toasts: [],
  modal: null,

  showLoading: (message) =>
    set({ isLoading: true, loadingMessage: message || null }),

  hideLoading: () => set({ isLoading: false, loadingMessage: null }),

  showToast: (message, type = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}`;
    const toast: ToastData = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // 자동 제거
    setTimeout(() => {
      get().hideToast(id);
    }, duration);
  },

  hideToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  showModal: (data) =>
    set({
      modal: {
        ...data,
        id: `modal-${Date.now()}`,
      },
    }),

  hideModal: () => set({ modal: null }),
}));
