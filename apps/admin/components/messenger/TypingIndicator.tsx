'use client';

import { TypingUser } from '@/hooks/useChat';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  return (
    <div className="px-4 py-1">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
        <span>
          {typingUsers.length === 1
            ? '입력 중...'
            : `${typingUsers.length}명 입력 중...`}
        </span>
      </div>
    </div>
  );
}
