import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type AccountRole } from '@/lib/profiles';

const quickActions = [
  { title: 'Scan QR Code', icon: 'qr-code-outline' as const, route: '/(tabs)/scan', primary: true },
  { title: 'Attendance History', icon: 'time-outline' as const, route: '/(tabs)/history', primary: false },
  { title: 'My Profile', icon: 'person-outline' as const, route: '/(tabs)/profile', primary: false },
];

const adminActions = [
  { title: 'Manage Teachers', icon: 'people-outline' as const, route: '/(tabs)/admin', primary: true },
  { title: 'My Profile', icon: 'person-outline' as const, route: '/(tabs)/profile', primary: false },
];

export default function Index() {
  const { user } = useAuth();
  const [role, setRole] = useState<AccountRole | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setRole(null);
      return () => { active = false; };
    }
    getProfile(user.id)
      .then((profile) => { if (active) setRole(profile?.role ?? 'student'); })
      .catch(() => { if (active) setRole('student'); });
    return () => { active = false; };
  }, [user]);

  const visibleActions = role === 'admin'
    ? adminActions
    : quickActions.filter((action) =>
        action.route !== '/(tabs)/scan' || (role !== null && role !== 'teacher')
      );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={role === 'admin' ? 'Admin Console' : 'QR Attendance'}
        subtitle={role === 'admin' ? 'School access and staff management' : 'School event attendance'}
      />

      <View style={styles.hero}>
        <View style={styles.illustration}>
          <View style={styles.illustrationGlow} />
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={40} color={COLORS.textOnPrimary} />
          </View>
          <Ionicons
            name={role === 'admin' ? 'people' : 'qr-code'}
            size={34}
            color={COLORS.primaryLight}
            style={styles.qrIcon}
          />
        </View>
        <Text style={styles.eyebrow}>{role === 'admin' ? 'ADMINISTRATOR' : 'SMART CHECK-IN'}</Text>
        <Text style={styles.mainTitle}>
          {role === 'admin' ? 'Keep your school organized.' : 'Attendance made simple.'}
        </Text>
        <Text style={styles.subtitle}>
          {role === 'admin'
            ? 'Review teacher access requests and manage approved staff from one place.'
            : 'Scan an event QR code to record attendance instantly and keep every check-in organized.'}
        </Text>
      </View>

      <View style={styles.actions}>
        {visibleActions.map((action) => (
          <AppButton
            key={action.route}
            theme={action.primary ? 'primary' : 'secondary'}
            title={action.title}
            icon={action.icon}
            onPress={() => router.navigate(action.route)}
          />
        ))}
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <Ionicons name={role === 'admin' ? 'shield-checkmark-outline' : 'bulb-outline'} size={21} color={COLORS.warning} />
        </View>
        <View style={styles.tipTextContainer}>
          <Text style={styles.tipTitle}>{role === 'admin' ? 'Administrator tools' : 'Quick tip'}</Text>
          <Text style={styles.tipText}>
            {role === 'admin'
              ? 'Open Manage Teachers to review applications or update teacher access.'
              : 'Open the camera, point it at the event QR, and let attendance register.'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1, paddingBottom: 18 },
  hero: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 16 },
  illustration: { alignItems: 'center', height: 126, justifyContent: 'center', marginBottom: 20, width: '100%' },
  illustrationGlow: { backgroundColor: COLORS.primarySoft, borderRadius: 94, height: 118, position: 'absolute', width: 118 },
  heroIcon: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 28, height: 78, justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18, width: 78, zIndex: 1 },
  qrIcon: { left: '16%', position: 'absolute', top: 42, transform: [{ rotate: '-8deg' }], zIndex: 2 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginBottom: 8 },
  mainTitle: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 12, textAlign: 'center' },
  actions: { paddingHorizontal: 24 },
  tipCard: { alignItems: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginHorizontal: 24, marginTop: 16, padding: 14 },
  tipIcon: { alignItems: 'center', backgroundColor: COLORS.accentSoft, borderRadius: 12, height: 40, justifyContent: 'center', width: 40 },
  tipTextContainer: { flex: 1 },
  tipTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  tipText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
});
