'use client';

import { useState } from 'react';
import { ChatMessageItem } from '@/hooks/useChat';
import { useSocket } from '@/contexts/SocketContext';

interface ChatBubbleProps {
  message: ChatMessageItem;
  isAdmin: boolean;
  showSender: boolean;
  currentUserId?: string;
  unreadCount?: number;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
}

export function ChatBubble({ message, isAdmin, showSender, currentUserId, unreadCount }: ChatBubbleProps) {
  const { deleteMessage, deleteOwnMessage } = useSocket();
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);

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
  const isOwnMessage = currentUserId && message.senderId === currentUserId;
  const hasImage = message.fileUrl && isImageUrl(message.fileUrl) && !imageError;
  const hasContent = !!message.content;

  const handleDelete = () => {
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;
    if (isOwnMessage) {
      deleteOwnMessage(message.roomId, message.id);
    } else {
      deleteMessage(message.roomId, message.id);
    }
  };

  // 이미지+캡션이 있는 메시지: 카드 스타일로 분리 렌더링
  if (hasImage) {
    return (
      <div
        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1 group`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className={`max-w-[280px] ${isAdmin ? 'items-end' : 'items-start'}`}>
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
            {/* Image card */}
            <div className={`relative rounded-2xl overflow-hidden ${
              isAdmin
                ? 'bg-blue-500 rounded-tr-sm'
                : senderIsAdmin
                  ? 'bg-purple-50 border border-purple-200 rounded-tl-sm'
                  : 'bg-white border border-gray-200 rounded-tl-sm'
            }`}>
              {/* Image */}
              <a href={message.fileUrl!} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={message.fileUrl!}
                  alt={message.fileName || '이미지'}
                  className="w-full max-h-[300px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onError={() => setImageError(true)}
                />
              </a>

              {/* Caption below image */}
              {hasContent && (
                <div className={`px-3 py-2 text-sm ${
                  isAdmin ? 'text-white' : 'text-gray-900'
                }`}>
                  <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere"
                     style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {message.content}
                  </p>
                </div>
              )}

              {/* Delete button */}
              {showActions && (
                <button
                  onClick={handleDelete}
                  className={`absolute top-1 ${isAdmin ? 'left-1' : 'right-1'} w-5 h-5 flex items-center justify-center rounded-full bg-black/40 hover:bg-red-500 text-white text-[10px] transition-colors`}
                  title="삭제"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Time + Unread */}
            <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} flex-shrink-0 gap-0.5`}>
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="text-[10px] font-bold text-green-500">{unreadCount}</span>
              )}
              <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 일반 텍스트 / 비이미지 파일 메시지
  return (
    <div
      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-1 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
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
          <div className={`relative px-3 py-2 rounded-2xl text-sm ${
            isAdmin
              ? 'bg-blue-500 text-white rounded-tr-sm'
              : senderIsAdmin
                ? 'bg-purple-50 border border-purple-200 text-gray-900 rounded-tl-sm'
                : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
          }`}>
            {/* Non-image file */}
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
            {hasContent && (
              <p className="whitespace-pre-wrap"
                 style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {message.content}
              </p>
            )}

            {/* Delete button */}
            {showActions && (
              <button
                onClick={handleDelete}
                className={`absolute -top-2 ${isAdmin ? '-left-2' : '-right-2'} w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-500 text-[10px] transition-colors shadow-sm`}
                title="삭제"
              >
                ✕
              </button>
            )}
          </div>

          {/* Time + Unread */}
          <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} flex-shrink-0 gap-0.5`}>
            {unreadCount !== undefined && unreadCount > 0 && (
              <span className="text-[10px] font-bold text-green-500">{unreadCount}</span>
            )}
            <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
