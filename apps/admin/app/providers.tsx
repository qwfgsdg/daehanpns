'use client';

import { AdminProvider } from '@/contexts/AdminContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
