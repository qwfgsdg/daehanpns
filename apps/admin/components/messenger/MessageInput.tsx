'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface MessageInputProps {
  roomId: string;
  disabled?: boolean;
}

export function MessageInput({ roomId, disabled }: MessageInputProps) {
  const { sendMessage, startTyping, stopTyping, isConnected } = useSocket();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [content]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(roomId);
    }
    // Reset timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      stopTyping(roomId);
    }, 2000);
  }, [roomId, startTyping, stopTyping]);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending || !isConnected) return;

    setIsSending(true);
    // Stop typing
    if (isTypingRef.current) {
      isTypingRef.current = false;
      stopTyping(roomId);
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    try {
      await sendMessage({ roomId, content: trimmed });
      setContent('');
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [content, isSending, isConnected, roomId, sendMessage, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border-t px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? '메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)' : '서버에 연결되어 있지 않습니다'}
          disabled={disabled || !isConnected}
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || isSending || !isConnected || disabled}
          className="px-4 py-2.5 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {isSending ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            '전송'
          )}
        </button>
      </div>
    </div>
  );
}
