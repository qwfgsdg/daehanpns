'use client';

import { ChatMessageItem } from '@/hooks/useChat';

interface ChatBubbleProps {
  message: ChatMessageItem;
  isAdmin: boolean;
  showSender: boolean;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatBubble({ message, isAdmin, showSender }: ChatBubbleProps) {
  if (message.isDeleted) {
    return (
      <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1`}>
        <div className="px-3 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm italic">
          삭제된 메시지입니다
        </div>
      </div>
    );
  }

  const senderIsAdmin = message.sender?.isAdmin || message.senderType === 'ADMIN';

  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showSender && !isAdmin && (
          <div className="flex items-center gap-1.5 mb-0.5 ml-1">
            {senderIsAdmin && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                관리자
              </span>
            )}
            <span className="text-xs text-gray-500 font-medium">
              {message.sender?.name || '알 수 없음'}
            </span>
          </div>
        )}

        <div className={`flex items-end gap-1.5 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Bubble */}
          <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
            isAdmin
              ? 'bg-blue-500 text-white rounded-tr-sm'
              : senderIsAdmin
                ? 'bg-purple-50 border border-purple-200 text-gray-900 rounded-tl-sm'
                : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
          }`}>
            {/* File attachment */}
            {message.fileUrl && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 mb-1 text-xs ${
                  isAdmin ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                <span>📎</span>
                <span className="underline truncate">{message.fileName || '파일'}</span>
              </a>
            )}

            {/* Content */}
            {message.content && (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>

          {/* Time */}
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
