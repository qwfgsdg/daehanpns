'use client';

import { useEffect, useRef } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useChat, getUnreadCount } from '@/hooks/useChat';
import { ChatHeader } from './ChatHeader';
import { ChatBubble } from './ChatBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatConversationProps {
  roomId: string;
  room: any;
}

function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function isSameDay(a: string, b: string): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return dateA.toDateString() === dateB.toDateString();
}

export function ChatConversation({ roomId, room }: ChatConversationProps) {
  const { admin } = useAdmin();
  const { messages, isLoadingMessages, hasMore, loadMore, typingUsers, readInfo } = useChat(roomId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLenRef.current) {
      // Only auto-scroll if user was near bottom
      const container = containerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom || prevMessagesLenRef.current === 0) {
          messagesEndRef.current?.scrollIntoView({ behavior: prevMessagesLenRef.current === 0 ? 'auto' : 'smooth' });
        }
      }
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages.length]);

  // Scroll to load more (infinite scroll upward)
  const handleScroll = () => {
    const container = containerRef.current;
    if (container && container.scrollTop < 100 && hasMore && !isLoadingMessages) {
      const prevHeight = container.scrollHeight;
      loadMore();
      // Maintain scroll position after loading older messages
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight;
        }
      });
    }
  };

  return (
    <>
      <ChatHeader room={room} />

      {/* Messages Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3"
      >
        {/* Loading indicator at top */}
        {isLoadingMessages && (
          <div className="text-center py-3">
            <span className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          </div>
        )}

        {!isLoadingMessages && !hasMore && messages.length > 0 && (
          <div className="text-center py-3 text-xs text-gray-400">
            대화의 시작입니다
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => {
          const isAdminMsg = msg.senderId === admin?.id;
          const showSender = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
          const showDateSeparator = idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt);
          const unread = getUnreadCount(msg, readInfo);

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-200 text-gray-500 text-xs px-3 py-1 rounded-full">
                    {formatDateSeparator(msg.createdAt)}
                  </div>
                </div>
              )}
              <ChatBubble
                message={msg}
                isAdmin={isAdminMsg}
                showSender={showSender}
                currentUserId={admin?.id}
                unreadCount={unread}
              />
            </div>
          );
        })}

        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput roomId={roomId} />
    </>
  );
}
