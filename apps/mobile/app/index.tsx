import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>대한P&S</Text>
        <Text style={styles.subtitle}>신뢰와 혁신으로 함께하는 파트너</Text>
      </View>

      <View style={styles.content}>
        <Link href="/register" asChild>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>📝</Text>
            <Text style={styles.cardTitle}>회원가입</Text>
            <Text style={styles.cardDescription}>
              대한P&S의 회원이 되어 다양한 서비스를 이용하세요
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/login" asChild>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>🔐</Text>
            <Text style={styles.cardTitle}>로그인</Text>
            <Text style={styles.cardDescription}>
              이미 회원이신가요? 로그인하여 서비스를 이용하세요
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  header: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
