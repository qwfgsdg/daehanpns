/**
 * 로딩 컴포넌트
 */

import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { COLORS } from '@/constants';
import { SPACING } from '@/theme';

interface Props {
  visible: boolean;
  message?: string;
}

export const Loading: React.FC<Props> = ({ visible, message }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.xl,
    alignItems: 'center',
    minWidth: 120,
  },
  message: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});
