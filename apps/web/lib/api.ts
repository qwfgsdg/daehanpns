const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // ===== 회원가입 =====
  static async register(data: {
    phone: string;
    password: string;
    name: string;
    nickname?: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    affiliateCode: string;
    referralCode?: string;
    managerId?: string;
  }) {
    return this.request<{
      accessToken: string;
      user: {
        id: string;
        phone: string;
        name: string;
        nickname: string | null;
        managerId: string | null;
      };
    }>('/auth/user/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== 로그인 =====
  static async login(phone: string, password: string) {
    return this.request<{
      accessToken: string;
      user: {
        id: string;
        phone: string;
        name: string;
        nickname: string | null;
      };
    }>('/auth/user/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  }

  // ===== SMS 인증번호 발송 =====
  static async sendSms(phone: string) {
    return this.request<{ success: boolean; message: string }>('/auth/sms/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  // ===== SMS 인증번호 확인 =====
  static async verifySms(phone: string, code: string) {
    return this.request<{ success: boolean; message: string }>('/auth/sms/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  // ===== 추천 코드 검증 =====
  static async validateReferralCode(code: string) {
    return this.request<{
      valid: boolean;
      manager?: {
        id: string;
        name: string;
        region: string | null;
        referralCode: string;
      };
      message?: string;
    }>(`/auth/validate-referral-code?code=${encodeURIComponent(code)}`);
  }

  // ===== 담당자 이름 검색 =====
  static async searchManagers(name: string) {
    return this.request<{
      managers: Array<{
        id: string;
        name: string;
        region: string | null;
        referralCode: string | null;
        tier: string;
      }>;
    }>(`/auth/search-managers?name=${encodeURIComponent(name)}`);
  }

  // ===== 소셜 회원가입 완료 =====
  static async completeSocialRegister(data: {
    provider: 'GOOGLE' | 'KAKAO';
    providerId: string;
    phone: string;
    name: string;
    nickname?: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    affiliateCode: string;
    email?: string;
    profileImage?: string;
    referralCode?: string;
    managerId?: string;
  }) {
    return this.request<{
      accessToken: string;
      user: {
        id: string;
        phone: string;
        name: string;
        nickname: string | null;
        managerId: string | null;
      };
    }>('/auth/social/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
