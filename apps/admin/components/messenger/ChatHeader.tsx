'use client';

import { useRouter } from 'next/navigation';

interface ChatHeaderProps {
  room: any;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  ONE_TO_N: '1:N 방송',
  ONE_TO_ONE: '1:1',
  TWO_WAY: '양방향',
};

export function ChatHeader({ room }: ChatHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">{room.name || '이름 없음'}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{ROOM_TYPE_LABELS[room.type] || room.type}</span>
            <span>|</span>
            <span>참여자 {room.participants?.length || 0}명</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => router.push(`/chats/${room.id}`)}
        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        관리
      </button>
    </div>
  );
}
