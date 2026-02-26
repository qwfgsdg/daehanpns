/**
 * Toast 알림 컴포넌트
 */

import React, { useEffect } from 'react';
import { Snackbar } from 'react-native-paper';
import { useUIStore } from '@/store';
import { COLORS } from '@/constants';

export const Toast: React.FC = () => {
  const { toasts, hideToast } = useUIStore();

  if (toasts.length === 0) return null;

  const toast = toasts[0]; // 첫 번째 토스트만 표시

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      case 'info':
        return COLORS.info;
      default:
        return COLORS.textPrimary;
    }
  };

  return (
    <Snackbar
      visible
      onDismiss={() => hideToast(toast.id)}
      duration={toast.duration || 3000}
      style={{ backgroundColor: getBackgroundColor() }}
    >
      {toast.message}
    </Snackbar>
  );
};
