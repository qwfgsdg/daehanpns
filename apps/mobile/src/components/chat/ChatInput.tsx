/**
 * 채팅 입력창 컴포넌트 (백엔드 ChatRoomType 일치)
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { sendMessage, startTyping, stopTyping } from '@/lib/socket';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';
import { TYPING_TIMEOUT } from '@/constants';
import { ChatRoomType } from '@/types';

interface Props {
  roomId: string;
  canSendMessage: boolean;
  roomType: ChatRoomType;
  onAttachPress?: () => void;
}

export const ChatInput: React.FC<Props> = ({
  roomId,
  canSendMessage,
  roomType,
  onAttachPress,
}) => {
  const [message, setMessage] = useState('');
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleChangeText = (text: string) => {
    setMessage(text);

    if (canSendMessage) {
      // 타이핑 시작
      startTyping(roomId);

      // 타이핑 타임아웃 재설정
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      typingTimeout.current = setTimeout(() => {
        stopTyping(roomId);
      }, TYPING_TIMEOUT);
    }
  };

  const handleSend = () => {
    if (!message.trim() || !canSendMessage) return;

    sendMessage(roomId, message.trim());
    setMessage('');

    // 타이핑 중지
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      stopTyping(roomId);
    }
  };

  // ONE_TO_N에서 일반 회원이면 비활성화
  if (!canSendMessage) {
    return (
      <View style={[styles.container, styles.disabled]}>
        <Text style={styles.disabledText}>
          {roomType === 'ONE_TO_N' ? '방장/부방장만 발언 가능합니다' : '메시지를 보낼 수 없습니다'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 첨부 버튼 */}
      <IconButton
        icon="attachment"
        size={24}
        iconColor={COLORS.textSecondary}
        onPress={onAttachPress}
      />

      {/* 입력창 */}
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={handleChangeText}
        placeholder="메시지를 입력하세요..."
        placeholderTextColor={COLORS.textPlaceholder}
        multiline
        maxLength={1000}
        returnKeyType="send"
        blurOnSubmit={false}
        onSubmitEditing={handleSend}
      />

      {/* 전송 버튼 */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          !message.trim() && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!message.trim()}
      >
        <IconButton
          icon="send"
          size={20}
          iconColor={message.trim() ? COLORS.white : COLORS.textDisabled}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.xs,
  },
  disabled: {
    justifyContent: 'center',
    backgroundColor: COLORS.gray50,
  },
  disabledText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray200,
  },
});
