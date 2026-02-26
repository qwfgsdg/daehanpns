'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { ApiClient } from '@/lib/api';

export interface ChatMessageItem {
  id: string;
  roomId: string;
  senderId: string;
  senderType: 'USER' | 'ADMIN';
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isDeleted: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    profileImage?: string;
    isAdmin: boolean;
  };
}

export interface TypingUser {
  userId: string;
  roomId: string;
}

export interface ReadInfo {
  totalActive: number;
  participants: Array<{ userId: string; lastReadAt: string | null }>;
}

/**
 * Calculate unread count for a message
 * = totalActive - count of participants who read at or after message.createdAt
 */
export function getUnreadCount(message: ChatMessageItem, readInfo: ReadInfo | null): number {
  if (!readInfo || readInfo.totalActive <= 1) return 0;
  const msgTime = new Date(message.createdAt).getTime();
  const readCount = readInfo.participants.filter(
    p => p.lastReadAt && new Date(p.lastReadAt).getTime() >= msgTime
  ).length;
  const unread = readInfo.totalActive - readCount;
  return unread > 0 ? unread : 0;
}

export function useChat(roomId: string | null) {
  const { socket, joinRoom, leaveRoom, readRoom } = useSocket();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [readInfo, setReadInfo] = useState<ReadInfo | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Join/leave room on roomId change
  useEffect(() => {
    if (currentRoomRef.current && currentRoomRef.current !== roomId) {
      leaveRoom(currentRoomRef.current);
    }

    if (roomId) {
      joinRoom(roomId);
      currentRoomRef.current = roomId;
      loadMessages(roomId, true);
      loadReadInfo(roomId);
      // Mark as read on room entry
      readRoom(roomId);
    } else {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      setReadInfo(null);
      currentRoomRef.current = null;
    }

    return () => {
      if (currentRoomRef.current) {
        leaveRoom(currentRoomRef.current);
        currentRoomRef.current = null;
      }
    };
  }, [roomId, joinRoom, leaveRoom, readRoom]);

  // Load read status via REST API
  const loadReadInfo = useCallback(async (targetRoomId: string) => {
    try {
      const result = await ApiClient.getReadStatus(targetRoomId);
      setReadInfo(result);
    } catch (error) {
      console.error('Failed to load read info:', error);
    }
  }, []);

  // Load messages via REST API
  const loadMessages = useCallback(async (targetRoomId: string, initial: boolean) => {
    setIsLoadingMessages(true);
    try {
      const params: any = { limit: 50, includeDeleted: false };
      if (!initial && nextCursor) {
        params.cursor = nextCursor;
      }
      const result = await ApiClient.getMessages(targetRoomId, params);
      const newMessages = result.messages || [];

      if (initial) {
        setMessages(newMessages.reverse());
      } else {
        setMessages(prev => [...newMessages.reverse(), ...prev]);
      }
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor || null);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [nextCursor]);

  // Load older messages (scroll up)
  const loadMore = useCallback(() => {
    if (roomId && hasMore && !isLoadingMessages) {
      loadMessages(roomId, false);
    }
  }, [roomId, hasMore, isLoadingMessages, loadMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: ChatMessageItem; timestamp: string }) => {
      if (data.message.roomId === currentRoomRef.current) {
        setMessages(prev => {
          // Prevent duplicate messages
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        // Auto read when viewing the room
        if (currentRoomRef.current) {
          readRoom(currentRoomRef.current);
        }
      }
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages(prev => prev.map(m =>
        m.id === data.messageId ? { ...m, isDeleted: true } : m
      ));
    };

    const handleTypingStart = (data: { roomId: string; userId: string }) => {
      if (data.roomId === currentRoomRef.current) {
        setTypingUsers(prev => {
          if (prev.some(t => t.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, roomId: data.roomId }];
        });
        // Auto-remove typing indicator after 5 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(t => t.userId !== data.userId));
        }, 5000);
      }
    };

    const handleTypingStop = (data: { roomId: string; userId: string }) => {
      setTypingUsers(prev => prev.filter(t => t.userId !== data.userId));
    };

    const handleUserRead = (data: { roomId: string; userId: string; lastReadAt: string }) => {
      if (data.roomId === currentRoomRef.current) {
        setReadInfo(prev => {
          if (!prev) return prev;
          const updated = prev.participants.map(p =>
            p.userId === data.userId ? { ...p, lastReadAt: data.lastReadAt } : p
          );
          // If user not in list, add them
          if (!updated.some(p => p.userId === data.userId)) {
            updated.push({ userId: data.userId, lastReadAt: data.lastReadAt });
          }
          return { ...prev, participants: updated };
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('typing:user_typing', handleTypingStart);
    socket.on('typing:user_stopped', handleTypingStop);
    socket.on('room:user_read', handleUserRead);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('typing:user_typing', handleTypingStart);
      socket.off('typing:user_stopped', handleTypingStop);
      socket.off('room:user_read', handleUserRead);
    };
  }, [socket, readRoom]);

  return {
    messages,
    isLoadingMessages,
    hasMore,
    loadMore,
    typingUsers,
    readInfo,
    setMessages,
  };
}
