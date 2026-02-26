/**
 * 채팅 상태 관리 (Zustand)
 */

import { create } from 'zustand';
import { ChatRoom, ChatMessage, EmojiReaction } from '@/types';

interface ChatState {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  messages: Record<string, ChatMessage[]>; // roomId → messages
  typingUsers: Record<string, string[]>;   // roomId → userNames

  // Actions
  setRooms: (rooms: ChatRoom[]) => void;
  addRoom: (room: ChatRoom) => void;
  updateRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  removeRoom: (roomId: string) => void;

  setCurrentRoom: (roomId: string | null) => void;

  setMessages: (roomId: string, messages: ChatMessage[]) => void;
  addMessage: (roomId: string, message: ChatMessage) => void;
  prependMessages: (roomId: string, messages: ChatMessage[]) => void;
  updateMessage: (
    roomId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ) => void;

  addReaction: (
    roomId: string,
    messageId: string,
    reaction: EmojiReaction
  ) => void;

  setTypingUsers: (roomId: string, userNames: string[]) => void;
  addTypingUser: (roomId: string, userName: string) => void;
  removeTypingUser: (roomId: string, userName: string) => void;

  clearMessages: (roomId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  messages: {},
  typingUsers: {},

  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) =>
    set((state) => ({
      rooms: [room, ...state.rooms],
    })),

  updateRoom: (roomId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r)),
    })),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
    })),

  setCurrentRoom: (roomId) => set({ currentRoomId: roomId }),

  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
    })),

  addMessage: (roomId, message) =>
    set((state) => {
      const existing = state.messages[roomId] || [];
      // 중복 체크
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [roomId]: [...existing, message],
        },
      };
    }),

  prependMessages: (roomId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...messages, ...(state.messages[roomId] || [])],
      },
    })),

  updateMessage: (roomId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: state.messages[roomId]?.map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    })),

  addReaction: (roomId, messageId, reaction) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: state.messages[roomId]?.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: [...(m.reactions || []), reaction],
              }
            : m
        ),
      },
    })),

  setTypingUsers: (roomId, userNames) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [roomId]: userNames },
    })),

  addTypingUser: (roomId, userName) =>
    set((state) => {
      const current = state.typingUsers[roomId] || [];
      if (current.includes(userName)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: [...current, userName],
        },
      };
    }),

  removeTypingUser: (roomId, userName) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [roomId]: (state.typingUsers[roomId] || []).filter((n) => n !== userName),
      },
    })),

  clearMessages: (roomId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[roomId];
      return { messages: newMessages };
    }),

  reset: () =>
    set({
      rooms: [],
      currentRoomId: null,
      messages: {},
      typingUsers: {},
    }),
}));
