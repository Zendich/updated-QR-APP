import { Link, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signIn, useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await signIn(email.trim(), password);
      if (authError) setError(authError.message);
      else if (!data.session) setError('Sign-in did not create a session. Please try again.');
      else router.replace('/(tabs)');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.ambientShape} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.logo}><Ionicons name="qr-code-sharp" size={33} color={COLORS.textOnPrimary} /></View>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Sign in to continue</Text>
            <Text style={styles.subtitle}>Manage event attendance and keep your student profile up to date.</Text>

            {authError ? <View style={styles.errorContainer}><Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} /><Text style={styles.error}>{authError}</Text></View> : null}
            <View style={styles.inputContainer}><Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} /><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email address" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={email} /></View>
            <View style={styles.inputContainer}><Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} /><TextInput autoCapitalize="none" autoComplete="password" onChangeText={setPassword} placeholder="Password" placeholderTextColor={COLORS.textSecondary} secureTextEntry style={styles.input} value={password} /></View>

            {error ? <View style={styles.errorContainer}><Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} /><Text style={styles.error}>{error}</Text></View> : null}
            {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : <AppButton accessibilityLabel="Sign in to QR Attendance" icon="log-in-outline" onPress={handleLogin} theme="primary" title="Sign In" />}

            <Link href="/register" style={styles.link}>New here? Create an account</Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  safeArea: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 18 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  ambientShape: { backgroundColor: COLORS.primarySoft, borderRadius: 120, height: 240, left: -110, opacity: 0.75, position: 'absolute', top: -80, width: 240 },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 26, borderWidth: 1, padding: 28, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.09, shadowRadius: 26, width: '100%', zIndex: 1 },
  logo: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 19, height: 64, justifyContent: 'center', marginBottom: 24, width: 64 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 7 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 24, marginTop: 8 },
  inputContainer: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 12, paddingHorizontal: 14 },
  input: { color: COLORS.textPrimary, flex: 1, fontSize: 16, paddingVertical: 14 },
  errorContainer: { alignItems: 'center', backgroundColor: COLORS.dangerSoft, borderRadius: 12, flexDirection: 'row', gap: 8, marginBottom: 10, padding: 11 },
  error: { color: COLORS.danger, flex: 1, fontSize: 13, lineHeight: 18 },
  loader: { marginVertical: 10 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginTop: 18, textAlign: 'center' },
});