/**
 * 프로필 수정 화면
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks';
import { useAuthStore, useUIStore } from '@/store';
import { updateMyProfile, getErrorMessage } from '@/lib/api';
import { COLORS, SPACING } from '@/constants';

export default function ProfileEditScreen() {
  const { user } = useAuth();
  const { updateUser } = useAuthStore();
  const { showLoading, hideLoading, showToast } = useUIStore();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>(user?.gender || '');
  const [birthDate, setBirthDate] = useState(
    user?.birthDate ? user.birthDate.split('T')[0] : ''
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해주세요.');
      return;
    }

    try {
      showLoading('저장 중...');

      const data: any = {
        name: name.trim(),
      };

      if (nickname.trim()) data.nickname = nickname.trim();
      if (gender) data.gender = gender;
      if (birthDate) data.birthDate = birthDate;

      const updatedUser = await updateMyProfile(data);

      // auth store 업데이트
      updateUser(updatedUser);

      showToast('프로필이 수정되었습니다.', 'success');
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
        <Text style={styles.label}>이름 *</Text>
        <TextInput
          mode="outlined"
          value={name}
          onChangeText={setName}
          style={styles.input}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
        />

        <Text style={styles.label}>닉네임</Text>
        <TextInput
          mode="outlined"
          value={nickname}
          onChangeText={setNickname}
          style={styles.input}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
        />

        <Text style={styles.label}>성별</Text>
        <View style={styles.genderRow}>
          <Button
            mode={gender === 'MALE' ? 'contained' : 'outlined'}
            onPress={() => setGender('MALE')}
            style={styles.genderButton}
            buttonColor={gender === 'MALE' ? COLORS.primary : undefined}
          >
            남성
          </Button>
          <Button
            mode={gender === 'FEMALE' ? 'contained' : 'outlined'}
            onPress={() => setGender('FEMALE')}
            style={styles.genderButton}
            buttonColor={gender === 'FEMALE' ? COLORS.primary : undefined}
          >
            여성
          </Button>
        </View>

        <Text style={styles.label}>생년월일 (YYYY-MM-DD)</Text>
        <TextInput
          mode="outlined"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="1990-01-01"
          style={styles.input}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          inputMode="numeric"
        />

        <Text style={styles.label}>전화번호</Text>
        <TextInput
          mode="outlined"
          value={user?.phone || ''}
          editable={false}
          style={[styles.input, styles.disabledInput]}
        />

        <Text style={styles.label}>로그인 방식</Text>
        <TextInput
          mode="outlined"
          value={user?.provider === 'LOCAL' ? '일반 로그인' : user?.provider === 'GOOGLE' ? '구글 로그인' : '카카오 로그인'}
          editable={false}
          style={[styles.input, styles.disabledInput]}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          buttonColor={COLORS.primary}
        >
          저장
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
  disabledInput: {
    backgroundColor: '#f5f5f5',
  },
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  genderButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.xs,
  },
});
