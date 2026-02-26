'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { ApiClient } from '@/lib/api';

interface MessageInputProps {
  roomId: string;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function isImageType(type: string) {
  return type.startsWith('image/');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

export function MessageInput({ roomId, disabled }: MessageInputProps) {
  const { sendMessage, startTyping, stopTyping, isConnected } = useSocket();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const dragCounterRef = useRef(0);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [content]);

  // Cleanup file preview URL
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const handleFile = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('허용되지 않는 파일 형식입니다 (jpeg, png, gif, webp, pdf, docx만 가능)');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('파일 크기가 10MB를 초과합니다');
      return;
    }

    setPendingFile(file);
    setCaption('');
    if (isImageType(file.type)) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  }, []);

  const clearFile = useCallback(() => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setPendingFile(null);
    setFilePreview(null);
    setCaption('');
  }, [filePreview]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(roomId);
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      stopTyping(roomId);
    }, 2000);
  }, [roomId, startTyping, stopTyping]);

  const handleSend = useCallback(async () => {
    if (isSending || !isConnected) return;

    // File send flow
    if (pendingFile) {
      setIsSending(true);
      setIsUploading(true);
      try {
        const result = await ApiClient.uploadChatFile(pendingFile);
        await sendMessage({
          roomId,
          content: caption.trim() || undefined,
          fileUrl: result.url,
          fileName: result.fileName,
        });
        clearFile();
        setContent('');
        textareaRef.current?.focus();
      } catch (error: any) {
        console.error('Failed to upload/send file:', error);
        alert(error.message || '파일 전송에 실패했습니다');
      } finally {
        setIsSending(false);
        setIsUploading(false);
      }
      return;
    }

    // Text-only send
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsSending(true);
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
  }, [content, caption, pendingFile, isSending, isConnected, roomId, sendMessage, stopTyping, clearFile]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Paste handler for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file);
          return;
        }
      }
    }
  };

  return (
    <div
      className={`bg-white border-t relative ${isDragging ? 'ring-2 ring-blue-400 ring-inset bg-blue-50' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50/80 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-sm text-blue-500 font-medium">파일을 여기에 놓으세요</div>
        </div>
      )}

      {/* File preview area */}
      {pendingFile && (
        <div className="px-4 pt-3 pb-2 border-b bg-gray-50">
          <div className="flex items-start gap-3">
            {filePreview ? (
              <img src={filePreview} alt="미리보기" className="w-20 h-20 object-cover rounded-lg border" />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center rounded-lg border bg-white">
                <span className="text-2xl">📎</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700 font-medium truncate">{pendingFile.name}</span>
                <button
                  onClick={clearFile}
                  className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0 ml-2"
                >
                  ✕
                </button>
              </div>
              <span className="text-[10px] text-gray-400">{formatFileSize(pendingFile.size)}</span>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="설명 입력 (선택사항)"
                className="w-full mt-1.5 px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSend}
              disabled={isSending || !isConnected}
              className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  업로드 중...
                </span>
              ) : '전송'}
            </button>
          </div>
        </div>
      )}

      {/* Message input area */}
      <div className="px-4 py-3">
        <div className="flex items-end gap-2">
          {/* File attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || !isConnected}
            className="p-2.5 text-gray-400 hover:text-gray-600 disabled:text-gray-300 transition-colors flex-shrink-0"
            title="파일 첨부"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isConnected ? '메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)' : '서버에 연결되어 있지 않습니다'}
            disabled={disabled || !isConnected}
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={(!content.trim() && !pendingFile) || isSending || !isConnected || disabled}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isSending && !pendingFile ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              '전송'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
