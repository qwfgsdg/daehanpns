'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { useSocket } from '@/contexts/SocketContext';
import { PermissionHelper, PERMISSIONS } from '@/lib/permissions';
import { auth } from '@/lib/auth';
import { RoomList } from '@/components/messenger/RoomList';
import { ChatConversation } from '@/components/messenger/ChatConversation';

export default function MessengerPage() {
  const router = useRouter();
  const { admin, isLoading: adminLoading } = useAdmin();
  const { isConnected } = useSocket();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  if (adminLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!PermissionHelper.hasPermission(admin, PERMISSIONS.CHATS_MANAGE)) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">접근 권한이 없습니다.</p>
      </div>
    );
  }

  const handleSelectRoom = (room: any) => {
    setSelectedRoomId(room.id);
    setSelectedRoom(room);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">관리자 메신저</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isConnected ? '연결됨' : '연결 끊김'}
          </span>
        </div>
      </header>

      {/* Main content: room list + conversation */}
      <div className="flex flex-1 overflow-hidden">
        {/* Room List */}
        <div className="w-80 border-r bg-white flex-shrink-0 overflow-hidden flex flex-col">
          <RoomList
            selectedRoomId={selectedRoomId}
            onSelectRoom={handleSelectRoom}
          />
        </div>

        {/* Conversation Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedRoomId && selectedRoom ? (
            <ChatConversation
              roomId={selectedRoomId}
              room={selectedRoom}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">채팅방을 선택하세요</p>
                <p className="text-sm mt-1">왼쪽에서 채팅방을 선택하면 대화가 표시됩니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
