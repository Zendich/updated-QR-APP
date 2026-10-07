import { Link, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <Ionicons name="qr-code-sharp" size={32} color={COLORS.textOnPrimary} />
        </View>
        <Text style={styles.eyebrow}>WELCOME BACK</Text>
        <Text style={styles.title}>Sign in to continue</Text>
        <Text style={styles.subtitle}>Manage event attendance and keep your student profile up to date.</Text>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : (
          <AppButton icon="log-in-outline" onPress={handleLogin} theme="primary" title="Sign In" />
        )}

        <Link href="/register" style={styles.link}>
          New here? Create an account
        </Link>
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
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 24, marginTop: 8 },
  input: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, color: COLORS.textPrimary, fontSize: 16, marginBottom: 12, paddingHorizontal: 15, paddingVertical: 13 },
  error: { color: COLORS.danger, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  loader: { marginVertical: 10 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginTop: 18, textAlign: 'center' },
});