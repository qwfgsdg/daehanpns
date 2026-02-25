/**
 * 채팅 메시지 컴포넌트 (핵심!)
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ChatMessage as ChatMessageType } from '@/types';
import { RoleBadge } from './RoleBadge';
import { EmojiReaction } from './EmojiReaction';
import { SystemMessage } from './SystemMessage';
import { formatChatTime } from '@/lib/utils';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';

interface Props {
  message: ChatMessageType;
  isMine: boolean;
  showSender?: boolean; // 같은 사람 연속 메시지는 이름 숨김
  showTime?: boolean; // 같은 분에 보낸 메시지는 시간 숨김
  canReact: boolean;
  onImagePress?: (imageUrl: string) => void;
}

const ChatMessageComponent: React.FC<Props> = ({
  message,
  isMine,
  showSender = true,
  showTime = true,
  canReact,
  onImagePress,
}) => {
  // 시스템 메시지
  if (message.type === 'SYSTEM') {
    return <SystemMessage content={message.content} />;
  }

  // 이미지 메시지
  const renderImage = () => {
    if (!message.imageUrl) return null;

    return (
      <TouchableOpacity
        onPress={() => onImagePress?.(message.imageUrl!)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: message.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>
    );
  };

  // 파일 메시지
  const renderFile = () => {
    if (!message.fileUrl) return null;

    return (
      <View style={styles.fileContainer}>
        <Text style={styles.fileIcon}>📎</Text>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {message.fileName || '파일'}
          </Text>
          {message.fileSize && (
            <Text style={styles.fileSize}>
              {(message.fileSize / 1024 / 1024).toFixed(2)} MB
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, isMine && styles.containerMine]}>
      {/* 송신자 정보 (상대 메시지만) */}
      {!isMine && showSender && (
        <View style={styles.senderInfo}>
          <View style={styles.senderRow}>
            {(message.senderType === 'ADMIN' || message.sender?.isAdmin) && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>관리자</Text>
              </View>
            )}
            <RoleBadge
              role={message.senderRole}
              userName={message.sender?.name || message.senderName}
              showLabel={false}
            />
          </View>
        </View>
      )}

      <View style={styles.messageRow}>
        {/* 메시지 버블 */}
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
            !showSender && !isMine && styles.bubbleNoSender,
          ]}
        >
          {/* 이미지 */}
          {renderImage()}

          {/* 파일 */}
          {renderFile()}

          {/* 텍스트 */}
          {message.content && (
            <Text
              style={[
                styles.text,
                isMine ? styles.textMine : styles.textOther,
              ]}
            >
              {message.content}
            </Text>
          )}

          {/* 이모지 반응 */}
          {message.reactions && message.reactions.length > 0 && (
            <EmojiReaction
              messageId={message.id}
              reactions={message.reactions}
              canReact={canReact}
            />
          )}
        </View>

        {/* 시간 & 읽음 표시 (내 메시지만) */}
        {isMine && showTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.time}>{formatChatTime(message.createdAt)}</Text>
            {message.isRead && <Text style={styles.readCheck}>✓✓</Text>}
          </View>
        )}

        {/* 시간 (상대 메시지) */}
        {!isMine && showTime && (
          <Text style={styles.time}>{formatChatTime(message.createdAt)}</Text>
        )}
      </View>
    </View>
  );
};

// 메모이제이션 (성능 최적화)
export const ChatMessage = memo(
  ChatMessageComponent,
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.reactions?.length === next.message.reactions?.length &&
    prev.isMine === next.isMine &&
    prev.showSender === next.showSender &&
    prev.showTime === next.showTime
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  containerMine: {
    alignItems: 'flex-end',
  },
  senderInfo: {
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.xs,
    maxWidth: '80%',
  },
  bubble: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    maxWidth: '100%',
  },
  bubbleOther: {
    backgroundColor: COLORS.chatBubbleOther,
    borderTopLeftRadius: BORDER_RADIUS.sm,
  },
  bubbleMine: {
    backgroundColor: COLORS.chatBubbleMine,
    borderTopRightRadius: BORDER_RADIUS.sm,
  },
  bubbleNoSender: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  textOther: {
    color: COLORS.chatTextOther,
  },
  textMine: {
    color: COLORS.chatTextMine,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  fileSize: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  time: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  readCheck: {
    fontSize: 11,
    color: COLORS.primary,
  },
});
