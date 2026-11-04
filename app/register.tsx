import { Link, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { resendSignupConfirmation, signUp } from '@/lib/auth';
import type { Role } from '@/lib/profiles';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [course, setCourse] = useState<string | null>(null);
  const [block, setBlock] = useState<string | null>(null);
  const [yearLevel, setYearLevel] = useState<string | null>(null);
  const [picker, setPicker] = useState<'course' | 'block' | 'year' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown === 0) return;
    const timer = setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRegister = async () => {
    setError(null);
    setMessage(null);
    if (!fullName.trim()) setError('Please enter your full name.');
    else if (role === 'student' && !course) setError('Please choose your course.');
    else if (role === 'student' && !block) setError('Please choose your block.');
    else if (role === 'student' && !yearLevel) setError('Please choose your year level.');
    else if (password.length < 6) setError('Password must be at least 6 characters.');
    else if (password !== confirmation) setError('Passwords do not match.');
    else {
      setLoading(true);
      try {
        const { data, error: authError } = await signUp(email.trim(), password, {
          full_name: fullName.trim(),
          role,
          ...(role === 'student' ? { course: course!, block: block!, year_level: yearLevel! } : {}),
        });
        if (authError) setError(authError.message);
        else if (role === 'teacher' && data.session) router.replace('/(tabs)/profile');
        else if (role === 'teacher') setMessage('Teacher request submitted. Confirm your email, then wait for an admin to review your request.');
        else if (data.session) router.replace('/(tabs)');
        else setMessage('Account created. Check your email to confirm your account, then sign in.');
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to create account.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResendConfirmation = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage(null);
      setError('Enter your email address above to resend the confirmation email.');
      return;
    }

    setError(null);
    setMessage(null);
    setResending(true);
    setResendCooldown(10);
    try {
      const { error: resendError } = await resendSignupConfirmation(trimmedEmail);
      if (resendError) setError(resendError.message);
      else setMessage('If this email has an unconfirmed account, a confirmation email has been sent.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to resend the confirmation email.');
    } finally {
      setResending(false);
    }
  };

  const resendDisabled = loading || resending || resendCooldown > 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.ambientShape} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.logo}>
              <Ionicons name="qr-code-sharp" size={32} color={COLORS.textOnPrimary} />
            </View>
            <Text style={styles.eyebrow}>CREATE YOUR ACCOUNT</Text>
            <Text style={styles.title}>Join the attendance app</Text>
            <Text style={styles.subtitle}>Choose how you will use QR attendance.</Text>

            <View style={styles.inputContainer}><Ionicons name="person-outline" size={20} color={COLORS.textSecondary} /><TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Full name" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={fullName} /></View>
            <View style={styles.inputContainer}><Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} /><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email address" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={email} /></View>
            <View style={styles.inputContainer}><Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} /><TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setPassword} placeholder="Password" placeholderTextColor={COLORS.textSecondary} secureTextEntry style={styles.input} value={password} /></View>
            <View style={styles.inputContainer}><Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textSecondary} /><TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setConfirmation} placeholder="Confirm password" placeholderTextColor={COLORS.textSecondary} secureTextEntry style={styles.input} value={confirmation} /></View>

            {role === 'student' ? (
              <>
                <Text style={styles.label}>Course</Text>
                <View style={[styles.selectField, styles.courseField, picker === 'course' && styles.openSelectField]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Course: ${course ?? 'Choose a course'}`}
                    accessibilityState={{ expanded: picker === 'course' }}
                    onPress={() => setPicker(picker === 'course' ? null : 'course')}
                    style={styles.selectButton}
                  >
                    <Text style={[styles.selectButtonText, !course && styles.selectPlaceholder]}>{course ?? 'Choose a course'}</Text>
                    <Ionicons name={picker === 'course' ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
                  </Pressable>
                  {picker === 'course' ? (
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdown}>
                      {['BSIT', 'BSHM', 'BEED'].map((option) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: course === option }}
                          key={option}
                          onPress={() => { setCourse(option); setPicker(null); }}
                          style={[styles.dropdownOption, course === option && styles.dropdownOptionSelected]}
                        >
                          <Text style={[styles.dropdownOptionText, course === option && styles.dropdownOptionTextSelected]}>{option}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
                <Text style={styles.label}>Block</Text>
                <View style={[styles.selectField, styles.blockField, picker === 'block' && styles.openSelectField]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Block: ${block ?? 'Choose a block'}`}
                    accessibilityState={{ expanded: picker === 'block' }}
                    onPress={() => setPicker(picker === 'block' ? null : 'block')}
                    style={styles.selectButton}
                  >
                    <Text style={[styles.selectButtonText, !block && styles.selectPlaceholder]}>{block ?? 'Choose a block'}</Text>
                    <Ionicons name={picker === 'block' ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
                  </Pressable>
                  {picker === 'block' ? (
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdown}>
                      {['A', 'B', 'C', 'D', 'E', 'F'].map((option) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: block === option }}
                          key={option}
                          onPress={() => { setBlock(option); setPicker(null); }}
                          style={[styles.dropdownOption, block === option && styles.dropdownOptionSelected]}
                        >
                          <Text style={[styles.dropdownOptionText, block === option && styles.dropdownOptionTextSelected]}>{option}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
                <Text style={styles.label}>Year</Text>
                <View style={[styles.selectField, styles.yearField, picker === 'year' && styles.openSelectField]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Year: ${yearLevel ?? 'Choose a year'}`}
                    accessibilityState={{ expanded: picker === 'year' }}
                    onPress={() => setPicker(picker === 'year' ? null : 'year')}
                    style={styles.selectButton}
                  >
                    <Text style={[styles.selectButtonText, !yearLevel && styles.selectPlaceholder]}>{yearLevel ?? 'Choose a year'}</Text>
                    <Ionicons name={picker === 'year' ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
                  </Pressable>
                  {picker === 'year' ? (
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdown}>
                      {['1st year', '2nd year', '3rd year', '4th year'].map((option) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: yearLevel === option }}
                          key={option}
                          onPress={() => { setYearLevel(option); setPicker(null); }}
                          style={[styles.dropdownOption, yearLevel === option && styles.dropdownOptionSelected]}
                        >
                          <Text style={[styles.dropdownOptionText, yearLevel === option && styles.dropdownOptionTextSelected]}>{option}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              </>
            ) : null}

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
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: resendDisabled }}
              disabled={resendDisabled}
              onPress={handleResendConfirmation}
              style={styles.resendButton}
            >
              <Text style={[styles.resendText, resendDisabled && styles.resendTextDisabled]}>
                {resending
                  ? 'Sending confirmation email...'
                  : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Resend confirmation email'}
              </Text>
            </Pressable>
            <Link href="/login" style={styles.link}>Already have an account? Sign in</Link>
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
  ambientShape: { backgroundColor: COLORS.primarySoft, borderRadius: 120, height: 240, right: -110, opacity: 0.75, position: 'absolute', top: -80, width: 240 },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 26, borderWidth: 1, padding: 28, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.09, shadowRadius: 26, width: '100%', zIndex: 1 },
  logo: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 19, height: 64, justifyContent: 'center', marginBottom: 24, width: 64 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 7 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20, marginTop: 8 },
  inputContainer: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 11, paddingHorizontal: 14 },
  input: { color: COLORS.textPrimary, flex: 1, fontSize: 16, paddingVertical: 13 },
  label: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  selectField: { position: 'relative' },
  courseField: { zIndex: 3 },
  blockField: { zIndex: 2 },
  yearField: { zIndex: 1 },
  openSelectField: { elevation: 20, zIndex: 20 },
  selectButton: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, minHeight: 48, paddingHorizontal: 14 },
  selectButtonText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  selectPlaceholder: { color: COLORS.textSecondary, fontWeight: '400' },
  dropdown: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 8, borderWidth: 1, elevation: 21, left: 0, maxHeight: 180, position: 'absolute', right: 0, top: 48, zIndex: 21 },
  dropdownOption: { borderBottomColor: COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 48, paddingHorizontal: 14 },
  dropdownOptionSelected: { backgroundColor: COLORS.primarySoft },
  dropdownOptionText: { color: COLORS.textPrimary, fontSize: 15 },
  dropdownOptionTextSelected: { color: COLORS.primary, fontWeight: '700' },
  roleChip: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, flex: 1, padding: 13 },
  roleChipActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  roleChipText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  roleChipTextActive: { color: COLORS.primary },
  error: { color: COLORS.danger, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  message: { color: COLORS.success, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  loader: { marginVertical: 10 },
  resendButton: { alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 2 },
  resendText: { color: COLORS.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  resendTextDisabled: { color: COLORS.textSecondary },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginTop: 18, textAlign: 'center' },
});