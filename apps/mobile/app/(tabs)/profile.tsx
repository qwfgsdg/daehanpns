/**
 * 프로필 화면
 */

import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Avatar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks';
import { COLORS, SPACING } from '@/constants';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 프로필 정보 */}
      <View style={styles.profileSection}>
        <Avatar.Text
          size={80}
          label={user?.name?.substring(0, 2) || 'U'}
          style={styles.avatar}
        />
        <Text style={styles.nameText}>{user?.name || '알 수 없음'}</Text>
        <Text style={styles.emailText}>{user?.phone || ''}</Text>
      </View>

      <Divider style={styles.divider} />

      {/* 메뉴 목록 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>설정</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/profile/edit')}
        >
          <View style={styles.menuLeft}>
            <MaterialCommunityIcons
              name="account-edit"
              size={24}
              color={COLORS.textSecondary}
            />
            <Text style={styles.menuLabel}>프로필 수정</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {user?.provider === 'LOCAL' && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profile/password')}
          >
            <View style={styles.menuLeft}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={24}
                color={COLORS.textSecondary}
              />
              <Text style={styles.menuLabel}>비밀번호 변경</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      <Divider style={styles.divider} />

      {/* 앱 정보 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>정보</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            Alert.alert('버전 정보', '대한피앤에스 v1.0.0');
          }}
        >
          <View style={styles.menuLeft}>
            <MaterialCommunityIcons
              name="information"
              size={24}
              color={COLORS.textSecondary}
            />
            <Text style={styles.menuLabel}>버전 정보</Text>
          </View>
          <Text style={styles.versionText}>v1.0.0</Text>
        </TouchableOpacity>
      </View>

      <Divider style={styles.divider} />

      {/* 로그아웃 */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileSection: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: '#fff',
  },
  avatar: {
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  divider: {
    marginVertical: SPACING.md,
  },
  menuSection: {
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  versionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  logoutSection: {
    padding: SPACING.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});
