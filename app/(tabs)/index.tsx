import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';

const quickActions = [
  { title: 'Scan QR Code', icon: 'qr-code-outline' as const, route: '/scan', primary: true },
  { title: 'Attendance History', icon: 'time-outline' as const, route: '/history', primary: false },
  { title: 'My Profile', icon: 'person-outline' as const, route: '/profile', primary: false },
];

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <Header title="QR Attendance" subtitle="School event attendance" />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark" size={38} color={COLORS.primary} />
        </View>
        <Text style={styles.eyebrow}>SMART CHECK-IN</Text>
        <Text style={styles.mainTitle}>Attendance made simple.</Text>
        <Text style={styles.subtitle}>
          Scan a QR code to record your attendance instantly and keep every event organized.
        </Text>
      </View>

      <View style={styles.actions}>
        {quickActions.map((action) => (
          <AppButton
            key={action.route}
            theme={action.primary ? 'primary' : 'secondary'}
            title={action.title}
            icon={action.icon}
            onPress={() => router.push(action.route)}
          />
        ))}
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={22} color={COLORS.warning} />
        <View style={styles.tipTextContainer}>
          <Text style={styles.tipTitle}>Quick tip</Text>
          <Text style={styles.tipText}>Open the camera, point it at the event QR, and let attendance register.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
    paddingBottom: 20,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 24,
    height: 76,
    justifyContent: 'center',
    marginBottom: 24,
    width: 76,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  mainTitle: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 24,
  },
  tipCard: {
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  tipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
