const API_BASE_URL = '/proxy-api';

interface ApiError {
  message: string;
  statusCode: number;
}

export class ApiClient {
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_token');
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
        statusCode: response.status,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ===== Auth APIs =====
  static async login(loginId: string, password: string) {
    return this.request<{ accessToken: string; admin: any }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, password }),
    });
  }

  static async getCurrentAdmin() {
    return this.request<any>('/auth/admin/me', {
      method: 'GET',
    });
  }

  static async validateReferralCode(code: string) {
    return this.request<{
      valid: boolean;
      manager?: {
        id: string;
        name: string;
        region: string;
        referralCode: string;
      };
      message?: string;
    }>(`/auth/validate-referral-code?code=${encodeURIComponent(code)}`);
  }

  static async searchManagers(name: string) {
    return this.request<{
      managers: Array<{
        id: string;
        name: string;
        region: string;
        referralCode: string;
        tier: string;
      }>;
    }>(`/auth/search-managers?name=${encodeURIComponent(name)}`);
  }

  // ===== Users APIs =====
  static async getUsers(params?: {
    search?: string;
    skip?: number;
    take?: number;
    orderBy?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.take !== undefined) queryParams.append('take', params.take.toString());
    if (params?.orderBy) queryParams.append('orderBy', params.orderBy);

    const query = queryParams.toString();
    return this.request<{ users: any[]; total: number; hasMore: boolean }>(
      `/users${query ? `?${query}` : ''}`
    );
  }

  static async getUser(id: string) {
    return this.request<any>(`/users/${id}`);
  }

  static async updateUser(id: string, data: any) {
    return this.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async banUser(id: string, reason?: string) {
    return this.request<any>(`/users/${id}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || '사유 없음' }),
    });
  }

  static async unbanUser(id: string) {
    return this.request<any>(`/users/${id}/unban`, {
      method: 'POST',
    });
  }

  static async deleteUser(id: string) {
    return this.request<any>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  static async changeMemberType(id: string, data: {
    memberType: 'STOCK' | 'COIN' | 'HYBRID';
    showCoinRooms: boolean;
    reason?: string;
  }) {
    return this.request<any>(`/users/${id}/member-type`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async toggleShowCoinRooms(id: string, data: {
    showCoinRooms: boolean;
    reason?: string;
  }) {
    return this.request<any>(`/users/${id}/show-coin-rooms`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async getMemberTypeHistory(id: string) {
    return this.request<any[]>(`/users/${id}/member-type-history`);
  }

  static async changeManager(id: string, data: {
    managerId: string;
    reason?: string;
  }) {
    return this.request<any>(`/users/${id}/manager`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async getManagerHistory(id: string) {
    return this.request<any[]>(`/users/${id}/manager-history`);
  }

  static async getUserHistory(userId: string, params?: {
    skip?: number;
    take?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.take !== undefined) queryParams.append('take', params.take.toString());

    const query = queryParams.toString();
    return this.request<{
      logs: any[];
      total: number;
      skip: number;
      take: number;
    }>(`/logs/target/USER/${userId}${query ? `?${query}` : ''}`);
  }

  static async getManagerStats(managerId: string) {
    return this.request<any>(`/users/manager/${managerId}/stats`);
  }

  static async getUserMemos(id: string) {
    return this.request<any[]>(`/users/${id}/memos`);
  }

  static async createUserMemo(id: string, content: string) {
    return this.request<any>(`/users/${id}/memos`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  static async exportUsersToExcel(params?: {
    search?: string;
    affiliateCode?: string;
    isBanned?: boolean;
  }): Promise<Blob> {
    const token = this.getAuthToken();
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.affiliateCode) queryParams.append('affiliateCode', params.affiliateCode);
    if (params?.isBanned !== undefined) queryParams.append('isBanned', params.isBanned.toString());

    const query = queryParams.toString();
    const response = await fetch(
      `${API_BASE_URL}/users/export/excel${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      throw new Error('엑셀 다운로드에 실패했습니다.');
    }

    return response.blob();
  }

  // ===== Dashboard APIs =====
  static async getDashboardStats() {
    return this.request<any>('/dashboard/stats');
  }

  // ===== Admins APIs =====
  static async getAdmins(params?: {
    tier?: string;
    isActive?: boolean;
    region?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.tier) queryParams.append('tier', params.tier);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.region) queryParams.append('region', params.region);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.take !== undefined) queryParams.append('take', params.take.toString());

    const query = queryParams.toString();
    return this.request<{ admins: any[]; total: number }>(`/admins${query ? `?${query}` : ''}`);
  }

  static async getAdmin(id: string) {
    return this.request<any>(`/admins/${id}`);
  }

  static async createAdmin(data: {
    loginId: string;
    email?: string;
    password: string;
    realName: string;
    salesName: string;
    tier: string;
    region?: string;
    logoUrl?: string;
  }) {
    return this.request<any>('/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateAdmin(id: string, data: {
    email?: string;
    realName?: string;
    salesName?: string;
    tier?: string;
    region?: string;
    logoUrl?: string;
  }) {
    return this.request<any>(`/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async updateAdminPassword(id: string, password: string) {
    return this.request<any>(`/admins/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  static async unlockAdmin(id: string) {
    return this.request<any>(`/admins/${id}/unlock`, {
      method: 'POST',
    });
  }

  static async getAdminPermissions(id: string) {
    return this.request<any[]>(`/admins/${id}/permissions`);
  }

  static async setAdminPermission(id: string, permission: string) {
    return this.request<any>(`/admins/${id}/permissions/${permission}`, {
      method: 'PUT',
    });
  }

  static async getInviteLink(id: string, baseUrl?: string) {
    const query = baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : '';
    return this.request<{ link: string; affiliationCode: string }>(`/admins/${id}/invite-link${query}`);
  }

  static async createTempAccount(affiliationCode: string, name: string) {
    return this.request<any>('/admins/temp-account', {
      method: 'POST',
      body: JSON.stringify({ affiliationCode, name }),
    });
  }

  static async updateAdminLogo(id: string, logoUrl: string) {
    return this.request<any>(`/admins/${id}/logo`, {
      method: 'PUT',
      body: JSON.stringify({ logoUrl }),
    });
  }

  static async deleteAdmin(id: string) {
    return this.request<any>(`/admins/${id}`, {
      method: 'DELETE',
    });
  }

  static async getAdminDeletionPreview(id: string) {
    return this.request<{
      admin: {
        id: string;
        name: string;
        tier: string;
        region: string;
        managedUsersCount: number;
      };
      subordinates: Array<{
        id: string;
        name: string;
        tier: string;
        managedUsersCount: number;
        subordinatesCount: number;
        canDelete: boolean;
        depth: number;
      }>;
      totalSubordinatesCount: number;
      availableReassignTargets: Array<{
        id: string;
        realName: string;
        tier: string;
        region: string;
      }>;
    }>(`/admins/${id}/deletion-preview`);
  }

  static async deleteAdminWithSubordinates(
    id: string,
    mainAdminUsersTarget: string | null,
    actions: Array<{
      subordinateId: string;
      action: 'reassign' | 'delete';
      targetAdminId?: string;
    }>
  ) {
    return this.request<{
      success: boolean;
      deletedAdminId: string;
      processedCount: number;
    }>(`/admins/${id}/delete-with-subordinates`, {
      method: 'POST',
      body: JSON.stringify({ mainAdminUsersTarget, actions }),
    });
  }

  // ===== Experts APIs =====
  static async getExperts(params?: { isActive?: boolean; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return this.request<{ experts: any[]; total: number }>(`/experts${query ? `?${query}` : ''}`);
  }

  static async getExpert(id: string) {
    return this.request<any>(`/experts/${id}`);
  }

  static async getExpertStats(id: string) {
    return this.request<any>(`/experts/${id}/stats`);
  }

  static async createExpert(data: {
    name: string;
    profileImage?: string;
    description?: string;
    vipRoomId?: string;
    vvipRoomId?: string;
  }) {
    return this.request<any>('/experts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateExpert(id: string, data: {
    name?: string;
    profileImage?: string;
    description?: string;
    vipRoomId?: string;
    vvipRoomId?: string;
    isActive?: boolean;
  }) {
    return this.request<any>(`/experts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteExpert(id: string) {
    return this.request<any>(`/experts/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== Subscriptions APIs =====
  static async getSubscriptions(params?: {
    userId?: string;
    expertId?: string;
    status?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.expertId) queryParams.append('expertId', params.expertId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.take !== undefined) queryParams.append('take', params.take.toString());

    const query = queryParams.toString();
    return this.request<{ subscriptions: any[]; total: number }>(
      `/subscriptions${query ? `?${query}` : ''}`
    );
  }

  static async getSubscription(id: string) {
    return this.request<any>(`/subscriptions/${id}`);
  }

  static async getUserSubscriptions(userId: string) {
    return this.request<any[]>(`/subscriptions/users/${userId}/subscriptions`);
  }

  static async createSubscription(data: {
    userId: string;
    expertId: string;
    roomType: string;
    durationMonths: number;
    startDate: string;
    depositName?: string;
    depositAmount?: number;
    adminMemo?: string;
  }) {
    return this.request<any>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async cancelSubscription(id: string, reason?: string) {
    return this.request<any>(`/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async extendSubscription(id: string, additionalMonths: number) {
    return this.request<any>(`/subscriptions/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ additionalMonths }),
    });
  }

  static async convertSubscription(id: string, newRoomType: string) {
    return this.request<any>(`/subscriptions/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({ newRoomType }),
    });
  }

  static async getSubscriptionStats() {
    return this.request<any>('/subscriptions/stats/overview');
  }

  // ===== Chats APIs =====
  static async getChats(params?: {
    type?: string;
    expertId?: string;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.expertId) queryParams.append('expertId', params.expertId);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.take !== undefined) queryParams.append('take', params.take.toString());

    const query = queryParams.toString();
    return this.request<{ rooms: any[]; total: number }>(`/chats${query ? `?${query}` : ''}`);
  }

  static async getChat(id: string) {
    return this.request<any>(`/chats/${id}`);
  }

  static async createChat(data: {
    type: string;
    category?: 'STOCK' | 'COIN';
    name?: string;
    description?: string;
    image?: string;
    maxParticipants?: number;
    ownerId?: string;
  }) {
    return this.request<any>('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateChat(id: string, data: {
    name?: string;
    description?: string;
    image?: string;
    maxParticipants?: number;
  }) {
    return this.request<any>(`/chats/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deactivateChat(id: string) {
    return this.request<any>(`/chats/${id}/deactivate`, {
      method: 'POST',
    });
  }

  static async activateChat(id: string) {
    return this.request<any>(`/chats/${id}/activate`, {
      method: 'POST',
    });
  }

  static async deleteChat(id: string, reason?: string) {
    return this.request<any>(`/chats/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  static async getParticipants(roomId: string, params?: {
    search?: string;
    ownerType?: string;
    isKicked?: boolean;
    isShadowBanned?: boolean;
    skip?: number;
    take?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.ownerType) queryParams.append('ownerType', params.ownerType);
    if (params?.isKicked !== undefined) queryParams.append('isKicked', params.isKicked.toString());
    if (params?.isShadowBanned !== undefined) queryParams.append('isShadowBanned', params.isShadowBanned.toString());
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.take !== undefined) queryParams.append('take', params.take.toString());

    const query = queryParams.toString();
    return this.request<{ participants: any[]; total: number }>(`/chats/${roomId}/participants${query ? `?${query}` : ''}`);
  }

  static async addParticipants(roomId: string, data: {
    userIds: string[];
    ownerType?: string;
  }) {
    return this.request<any>(`/chats/${roomId}/participants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async changeRole(roomId: string, userId: string, ownerType: string) {
    return this.request<any>(`/chats/${roomId}/participants/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ ownerType }),
    });
  }

  static async kickParticipant(roomId: string, userId: string, reason: string) {
    return this.request<any>(`/chats/${roomId}/participants/${userId}/kick`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async unkickParticipant(roomId: string, userId: string) {
    return this.request<any>(`/chats/${roomId}/participants/${userId}/unkick`, {
      method: 'POST',
    });
  }

  static async shadowBanParticipant(roomId: string, userId: string, reason?: string) {
    return this.request<any>(`/chats/${roomId}/participants/${userId}/shadow-ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async unshadowBanParticipant(roomId: string, userId: string) {
    return this.request<any>(`/chats/${roomId}/participants/${userId}/unshadow-ban`, {
      method: 'POST',
    });
  }

  static async getMessages(roomId: string, params?: {
    cursor?: string;
    limit?: number;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    senderId?: string;
    hasFile?: boolean;
    includeDeleted?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.senderId) queryParams.append('senderId', params.senderId);
    if (params?.hasFile !== undefined) queryParams.append('hasFile', params.hasFile.toString());
    if (params?.includeDeleted !== undefined) queryParams.append('includeDeleted', params.includeDeleted.toString());

    const query = queryParams.toString();
    return this.request<{ messages: any[]; nextCursor?: string; hasMore: boolean }>(`/chats/${roomId}/messages${query ? `?${query}` : ''}`);
  }

  static async deleteMessage(roomId: string, messageId: string) {
    return this.request<any>(`/chats/${roomId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  static async bulkDeleteMessages(roomId: string, messageIds: string[]) {
    return this.request<any>(`/chats/${roomId}/messages/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ messageIds }),
    });
  }

  static async getPinnedMessages(roomId: string) {
    return this.request<{ pinnedMessages: any[] }>(`/chats/${roomId}/pinned-messages`);
  }

  static async pinMessage(roomId: string, messageId: string) {
    return this.request<any>(`/chats/${roomId}/messages/${messageId}/pin`, {
      method: 'POST',
    });
  }

  static async unpinMessage(roomId: string, pinnedMessageId: string) {
    return this.request<any>(`/chats/${roomId}/pinned-messages/${pinnedMessageId}`, {
      method: 'DELETE',
    });
  }

  static async getChatStats(id: string) {
    return this.request<any>(`/chats/${id}`);
  }

  static async getUserChatSanctions(userId: string) {
    return this.request<any>(`/users/${userId}/chat-sanctions`);
  }

  // ===== Stats APIs =====
  static async getChatStatsSummary(params: {
    startDate: string;
    endDate: string;
    scope?: 'all' | 'room' | 'category';
    roomId?: string;
    category?: string;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.scope) queryParams.append('scope', params.scope);
    if (params.roomId) queryParams.append('roomId', params.roomId);
    if (params.category) queryParams.append('category', params.category);

    return this.request<{
      totalMessages: number;
      activeUsers: number;
      activeAdmins: number;
      weeklyChange: number;
    }>(`/stats/chat/summary?${queryParams.toString()}`);
  }

  static async getChatTopUsers(params: {
    startDate: string;
    endDate: string;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return this.request<Array<{
      userId: string;
      nickname: string;
      name: string;
      profileImage?: string | null;
      messageCount: number;
      roomCount: number;
      weeklyChange: number;
    }>>(`/stats/chat/top-users?${queryParams.toString()}`);
  }

  static async getChatDailyTrend(params: {
    startDate: string;
    endDate: string;
    scope?: 'all' | 'room' | 'category';
    roomId?: string;
    category?: string;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.scope) queryParams.append('scope', params.scope);
    if (params.roomId) queryParams.append('roomId', params.roomId);
    if (params.category) queryParams.append('category', params.category);

    return this.request<Array<{
      date: string;
      messageCount: number;
    }>>(`/stats/chat/daily-trend?${queryParams.toString()}`);
  }

  static async getChatUserStats(params: {
    startDate: string;
    endDate: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    return this.request<{
      users: Array<{
        userId: string;
        nickname: string;
        name: string;
        profileImage?: string | null;
        messageCount: number;
        roomCount: number;
        weeklyChange: number;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/stats/chat/users?${queryParams.toString()}`);
  }

  static async getChatRoomStats(params: {
    startDate: string;
    endDate: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    return this.request<{
      rooms: Array<{
        roomId: string;
        roomName: string;
        roomType: string;
        category: string;
        messageCount: number;
        participantCount: number;
        weeklyChange: number;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/stats/chat/rooms?${queryParams.toString()}`);
  }
}
