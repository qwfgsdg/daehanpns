/**
 * 채팅 관련 API
 * 백엔드는 래핑 없이 직접 반환
 */

import { apiClient } from './client';
import { ChatRoom, ChatMessage, GetMessagesQuery } from '@/types';

/**
 * 채팅방 목록 조회 (내가 참여한 방)
 */
export const getChatRooms = async (): Promise<ChatRoom[]> => {
  const response = await apiClient.get('/chat/rooms');
  return response.data?.rooms || response.data || [];
};

/**
 * 공개 채팅방 목록 조회
 */
export const getPublicChatRooms = async (): Promise<ChatRoom[]> => {
  const response = await apiClient.get('/chat/rooms/public');
  return response.data?.rooms || response.data || [];
};

/**
 * 채팅방 상세 조회
 */
export const getChatRoom = async (roomId: string): Promise<ChatRoom> => {
  const response = await apiClient.get(`/chat/rooms/${roomId}`);
  return response.data;
};

/**
 * 채팅방 메시지 조회
 */
export const getChatMessages = async (
  roomId: string,
  offset = 0,
  limit = 50
): Promise<ChatMessage[]> => {
  const response = await apiClient.get(`/chat/rooms/${roomId}/messages`, {
    params: { skip: offset, take: limit },
  });
  return response.data?.items || response.data || [];
};

/**
 * 공개 채팅방 입장
 */
export const joinPublicRoom = async (roomId: string): Promise<any> => {
  const response = await apiClient.post(`/chat/rooms/${roomId}/join`);
  return response.data;
};

/**
 * 채팅방 나가기
 */
export const leaveRoom = async (roomId: string): Promise<void> => {
  await apiClient.post(`/chat/rooms/${roomId}/leave`);
};

/**
 * 채팅방 공지사항 수정 (방장/부방장만)
 */
export const updateRoomNotice = async (
  roomId: string,
  notice: string
): Promise<void> => {
  await apiClient.patch(`/chat/rooms/${roomId}/notice`, { notice });
};

/**
 * 이모지 반응 추가
 */
export const addMessageReaction = async (
  messageId: string,
  emoji: string
): Promise<void> => {
  await apiClient.post(`/chat/messages/${messageId}/reactions`, { emoji });
};

/**
 * 메시지 읽음 처리
 */
export const markMessageAsRead = async (
  roomId: string,
  messageId: string
): Promise<void> => {
  await apiClient.patch(`/chat/rooms/${roomId}/messages/${messageId}/read`);
};

/**
 * 채팅방 멤버 목록 조회
 */
export const getRoomMembers = async (roomId: string) => {
  const response = await apiClient.get(`/chat/rooms/${roomId}/members`);
  return response.data || [];
};
