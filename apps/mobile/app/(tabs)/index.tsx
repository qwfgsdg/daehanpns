/**
 * 홈 화면
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Card, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks';
import { COLORS } from '@/constants';
import { SPACING } from '@/theme';
import { getBanners } from '@/lib/api';
import { Banner } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const data = await getBanners();
      setBanners(data);
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      setBannersLoading(false);
    }
  };

  const handleBannerPress = (banner: Banner) => {
    if (banner.linkUrl) {
      Linking.openURL(banner.linkUrl).catch(() => {});
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 환영 메시지 */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          안녕하세요, {user?.name || '회원'}님!
        </Text>
        <Text style={styles.subtitleText}>
          대한피앤에스와 함께하는 스마트한 소통
        </Text>
      </View>

      {/* 배너 섹션 */}
      {bannersLoading ? (
        <View style={styles.bannerLoading}>
          <ActivityIndicator size="small" />
        </View>
      ) : banners.length > 0 ? (
        <View style={styles.bannerSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.bannerScroll}
          >
            {banners.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                activeOpacity={banner.linkUrl ? 0.8 : 1}
                onPress={() => handleBannerPress(banner)}
              >
                <Image
                  source={{ uri: banner.imageUrl }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* 빠른 메뉴 */}
      <View style={styles.quickMenuSection}>
        <Text style={styles.sectionTitle}>빠른 메뉴</Text>

        <View style={styles.menuGrid}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/chat/public')}
          >
            <View style={[styles.menuIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <MaterialCommunityIcons name="message-text" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.menuLabel}>공개 채팅방</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <View style={[styles.menuIcon, { backgroundColor: COLORS.success + '20' }]}>
              <MaterialCommunityIcons name="chat" size={32} color={COLORS.success} />
            </View>
            <Text style={styles.menuLabel}>내 채팅방</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* 구독 정보 */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>내 구독</Text>
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoText}>
              구독 정보는 프로필 탭에서 확인하세요.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  welcomeSection: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  subtitleText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  bannerSection: {
    marginTop: 0,
  },
  bannerScroll: {
    flexGrow: 0,
  },
  bannerImage: {
    width: screenWidth,
    height: screenWidth * 0.4,
  },
  bannerLoading: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickMenuSection: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  menuGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: SPACING.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    marginVertical: SPACING.md,
  },
  infoSection: {
    padding: SPACING.lg,
  },
  infoCard: {
    backgroundColor: '#fff',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
});
