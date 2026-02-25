'use client';

import { SocketProvider } from '@/contexts/SocketContext';

export default function MessengerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      {children}
    </SocketProvider>
  );
}
