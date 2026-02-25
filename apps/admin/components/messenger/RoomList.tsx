'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';

interface RoomListProps {
  selectedRoomId: string | null;
  onSelectRoom: (room: any) => void;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  ONE_TO_N: '1:N 방송',
  ONE_TO_ONE: '1:1',
  TWO_WAY: '양방향',
};

const CATEGORY_LABELS: Record<string, string> = {
  STOCK: '주식',
  COIN: '코인',
};

export function RoomList({ selectedRoomId, onSelectRoom }: RoomListProps) {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [newMessageRooms, setNewMessageRooms] = useState<Set<string>>(new Set());

  const loadRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = { take: 100, isActive: true };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const result = await ApiClient.getChats(params);
      setRooms(result.rooms || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Listen for new messages to show unread indicator
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: any }) => {
      const msgRoomId = data.message?.roomId;
      if (msgRoomId && msgRoomId !== selectedRoomId) {
        setNewMessageRooms(prev => new Set(prev).add(msgRoomId));
      }
    };

    socket.on('message:new', handleNewMessage);
    return () => { socket.off('message:new', handleNewMessage); };
  }, [socket, selectedRoomId]);

  // Clear unread indicator when selecting a room
  const handleSelectRoom = (room: any) => {
    setNewMessageRooms(prev => {
      const next = new Set(prev);
      next.delete(room.id);
      return next;
    });
    onSelectRoom(room);
  };

  return (
    <>
      {/* Search & Filter */}
      <div className="p-3 border-b space-y-2">
        <input
          type="text"
          placeholder="채팅방 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 유형</option>
          <option value="ONE_TO_N">1:N 방송</option>
          <option value="ONE_TO_ONE">1:1</option>
          <option value="TWO_WAY">양방향</option>
        </select>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : rooms.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">채팅방이 없습니다</div>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleSelectRoom(room)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                selectedRoomId === room.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate text-sm">
                      {room.name || '이름 없음'}
                    </span>
                    {newMessageRooms.has(room.id) && (
                      <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {ROOM_TYPE_LABELS[room.type] || room.type}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {CATEGORY_LABELS[room.category] || room.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {room.participants?.length || 0}명
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}
