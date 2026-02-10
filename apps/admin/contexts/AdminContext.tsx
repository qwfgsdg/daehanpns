'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api';
import { auth } from '@/lib/auth';
import { AdminUser } from '@/lib/permissions';

interface AdminContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  refreshAdmin: () => Promise<void>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdmin = useCallback(async () => {
    // 토큰이 없으면 로딩 종료
    if (!auth.isAuthenticated()) {
      setAdmin(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const adminData = await ApiClient.getCurrentAdmin();
      setAdmin(adminData);
    } catch (err: any) {
      console.error('[AdminContext] Failed to load admin:', err);
      setError(err.message || 'Failed to load admin data');

      // 인증 에러 시 토큰 제거 및 로그인 페이지로 이동
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        auth.removeToken();
        setAdmin(null);

        // 로그인 페이지가 아닐 때만 리다이렉트
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          router.push('/login');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const refreshAdmin = useCallback(async () => {
    await loadAdmin();
  }, [loadAdmin]);

  const logout = useCallback(() => {
    auth.removeToken();
    setAdmin(null);
    setError(null);
    router.push('/login');
  }, [router]);

  // 초기 로드
  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  // 토큰 변경 감지 (다른 탭에서 로그인/로그아웃 시)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_token') {
        if (e.newValue) {
          // 토큰이 추가되면 admin 정보 로드
          loadAdmin();
        } else {
          // 토큰이 제거되면 로그아웃
          setAdmin(null);
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            router.push('/login');
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadAdmin, router]);

  return (
    <AdminContext.Provider value={{ admin, isLoading, error, refreshAdmin, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
