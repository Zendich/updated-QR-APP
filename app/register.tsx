import { Link, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';
import type { Role } from '@/lib/profiles';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setMessage(null);
    if (!fullName.trim()) setError('Please enter your full name.');
    else if (password.length < 6) setError('Password must be at least 6 characters.');
    else if (password !== confirmation) setError('Passwords do not match.');
    else {
      setLoading(true);
      try {
        const { data, error: authError } = await signUp(email.trim(), password, { full_name: fullName.trim(), role });
        if (authError) setError(authError.message);
        else if (data.session) router.replace('/(tabs)');
        else setMessage('Account created. Check your email to confirm your account, then sign in.');
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to create account.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <Ionicons name="qr-code-sharp" size={32} color={COLORS.textOnPrimary} />
        </View>
        <Text style={styles.eyebrow}>CREATE YOUR ACCOUNT</Text>
        <Text style={styles.title}>Join the attendance app</Text>
        <Text style={styles.subtitle}>Choose how you will use QR attendance.</Text>

        <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Full name" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={fullName} />
        <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email address" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={email} />
        <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setPassword} placeholder="Password" placeholderTextColor={COLORS.textSecondary} secureTextEntry style={styles.input} value={password} />
        <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setConfirmation} placeholder="Confirm password" placeholderTextColor={COLORS.textSecondary} secureTextEntry style={styles.input} value={confirmation} />

        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleRow}>
          {(['student', 'teacher'] as Role[]).map((option) => (
            <Pressable key={option} onPress={() => setRole(option)} style={[styles.roleChip, role === option && styles.roleChipActive]}>
              <Text style={[styles.roleChipText, role === option && styles.roleChipTextActive]}>{option === 'student' ? 'Student' : 'Teacher'}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : <AppButton icon="person-add-outline" onPress={handleRegister} theme="primary" title="Create Account" />}
        <Link href="/login" style={styles.link}>Already have an account? Sign in</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: COLORS.background, flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 24, borderWidth: 1, padding: 28, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, width: '100%' },
  logo: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 18, height: 64, justifyContent: 'center', marginBottom: 24, width: 64 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 7 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 22, marginTop: 8 },
  input: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, color: COLORS.textPrimary, fontSize: 16, marginBottom: 11, paddingHorizontal: 15, paddingVertical: 13 },
  label: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleChip: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, flex: 1, padding: 13 },
  roleChipActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  roleChipText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  roleChipTextActive: { color: COLORS.primary },
  error: { color: COLORS.danger, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  message: { color: COLORS.success, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  loader: { marginVertical: 10 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginTop: 18, textAlign: 'center' },
});