/**
 * 비밀번호 변경 화면
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useUIStore } from '@/store';
import { changePassword, getErrorMessage } from '@/lib/api';
import { COLORS } from '@/constants';
import { SPACING } from '@/theme';

export default function PasswordChangeScreen() {
  const { showLoading, hideLoading, showToast } = useUIStore();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('알림', '현재 비밀번호를 입력해주세요.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert('알림', '새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('알림', '새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('알림', '현재 비밀번호와 다른 비밀번호를 입력해주세요.');
      return;
    }

    try {
      showLoading('비밀번호 변경 중...');

      await changePassword(currentPassword, newPassword);

      showToast('비밀번호가 변경되었습니다.', 'success');
      router.back();
    } catch (error) {
      const message = getErrorMessage(error);
      showToast(message, 'error');
    } finally {
      hideLoading();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.description}>
          비밀번호를 변경합니다. 현재 비밀번호를 입력한 후 새 비밀번호를 설정해주세요.
        </Text>

        <Text style={styles.label}>현재 비밀번호</Text>
        <TextInput
          mode="outlined"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry={!showCurrent}
          style={styles.input}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          right={
            <TextInput.Icon
              icon={showCurrent ? 'eye-off' : 'eye'}
              onPress={() => setShowCurrent(!showCurrent)}
            />
          }
        />

        <Text style={styles.label}>새 비밀번호</Text>
        <TextInput
          mode="outlined"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNew}
          style={styles.input}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          right={
            <TextInput.Icon
              icon={showNew ? 'eye-off' : 'eye'}
              onPress={() => setShowNew(!showNew)}
            />
          }
        />
        <Text style={styles.hint}>6자 이상 입력해주세요</Text>

        <Text style={styles.label}>새 비밀번호 확인</Text>
        <TextInput
          mode="outlined"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          style={styles.input}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          right={
            <TextInput.Icon
              icon={showConfirm ? 'eye-off' : 'eye'}
              onPress={() => setShowConfirm(!showConfirm)}
            />
          }
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <Text style={styles.errorHint}>비밀번호가 일치하지 않습니다</Text>
        )}

        <Button
          mode="contained"
          onPress={handleChangePassword}
          style={styles.saveButton}
          buttonColor={COLORS.primary}
          disabled={!currentPassword || !newPassword || !confirmPassword}
        >
          비밀번호 변경
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  form: {
    padding: SPACING.lg,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  errorHint: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  saveButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.xs,
  },
});
