import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const loadedProfile = await getProfile(user.id);
    setProfile(loadedProfile);
    setDraftName(loadedProfile?.full_name ?? '');
    setLoading(false);
  }, [user]);
  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const trimmedName = draftName.trim();
    const { error } = await updateProfile(user.id, { full_name: trimmedName });
    setSaving(false);
    if (error) { Alert.alert('Error', error); return; }
    setProfile((current) => current ? { ...current, full_name: trimmedName } : current);
    setEditing(false);
  };
  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) { Alert.alert('Error', error); return; }
      router.replace('/login');
    }
    catch (error) { Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out.'); }
  };

  const roleLabel = profile?.role === 'admin' ? 'Administrator account' : profile?.role === 'teacher' ? 'Teacher account' : 'Student account';
  const roleIcon = profile?.role === 'admin' ? 'shield-checkmark-outline' : profile?.role === 'teacher' ? 'briefcase-outline' : 'school-outline';
  const roleBadgeStyle = profile?.role === 'admin' ? styles.adminBadge : profile?.role === 'teacher' ? styles.teacherBadge : styles.studentBadge;
  const roleIconColor = profile?.role === 'admin' ? COLORS.success : profile?.role === 'teacher' ? COLORS.warning : COLORS.primary;
  const teacherStatusMessage = profile?.teacher_status === 'pending'
    ? 'Your teacher request is waiting for admin approval.'
    : profile?.teacher_status === 'rejected'
      ? 'Your teacher request was not approved. Contact an administrator if you think this is a mistake.'
      : 'Your teacher account is approved.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading}><View style={styles.avatar}><Ionicons name="person-outline" size={31} color={COLORS.textOnPrimary} /></View><View><Text style={styles.title}>My profile</Text><Text style={styles.subtitle}>Manage your account details.</Text></View></View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : <View style={styles.content}>
        <View style={[styles.roleBadge, roleBadgeStyle]}><Ionicons name={roleIcon} size={16} color={roleIconColor} /><Text style={styles.roleBadgeText}>{roleLabel}</Text></View>
        {profile?.role === 'teacher' ? <View style={[styles.approvalNotice, profile.teacher_status === 'approved' ? styles.approvalApproved : profile.teacher_status === 'rejected' ? styles.approvalRejected : styles.approvalPending]}><Ionicons name={profile.teacher_status === 'approved' ? 'checkmark-circle-outline' : profile.teacher_status === 'rejected' ? 'close-circle-outline' : 'time-outline'} size={20} color={profile.teacher_status === 'approved' ? COLORS.success : profile.teacher_status === 'rejected' ? COLORS.danger : COLORS.warning} /><Text style={styles.approvalText}>{teacherStatusMessage}</Text></View> : null}
        <View style={styles.profileCard}>
          {profile?.role === 'student' ? (
            <>
              <Text style={styles.fieldLabel}>Course</Text><Text style={styles.email}>{profile.course ?? 'Not set'}</Text>
              <Text style={styles.fieldLabel}>Block</Text><Text style={styles.email}>{profile.block ?? 'Not set'}</Text>
              <Text style={styles.fieldLabel}>Year</Text><Text style={styles.email}>{profile.year_level ?? 'Not set'}</Text>
            </>
          ) : null}
          <Text style={styles.fieldLabel}>Display name</Text>
          {editing ? <View style={styles.nameEditRow}><TextInput autoCapitalize="words" onChangeText={setDraftName} placeholder="Full name" placeholderTextColor={COLORS.textSecondary} style={styles.nameInput} value={draftName} /><Pressable accessibilityRole="button" disabled={saving} onPress={handleSaveName} style={styles.saveButton}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text></Pressable></View> : <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.nameRow}><Text style={styles.name}>{profile?.full_name || 'Tap to add your name'}</Text><Text style={styles.editHint}>Edit</Text></Pressable>}
          <Text style={styles.fieldLabel}>Email</Text><Text style={styles.email}>{profile?.email ?? user?.email ?? 'Signed-in user'}</Text>
          <Text style={styles.fieldLabel}>Account ID</Text><Text style={styles.id}>{user?.id}</Text>
        </View>
      </View>}
      <View style={styles.actionContainer}><AppButton icon="log-out-outline" onPress={handleSignOut} title="Sign Out" /></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1, paddingBottom: 24 },
  heading: { alignItems: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 14, margin: 20, padding: 16 },
  avatar: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 18, height: 58, justifyContent: 'center', width: 58 },
  title: { color: COLORS.textPrimary, fontSize: 21, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  loader: { alignSelf: 'center', marginTop: 36 },
  roleBadge: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 7, marginBottom: 18, paddingHorizontal: 18, paddingVertical: 9 },
  teacherBadge: { backgroundColor: COLORS.warningSoft },
  studentBadge: { backgroundColor: COLORS.primarySoft },
  adminBadge: { backgroundColor: COLORS.successSoft },
  roleBadgeText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  approvalNotice: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 10, marginBottom: 16, padding: 13, width: '100%' },
  approvalPending: { backgroundColor: COLORS.warningSoft },
  approvalApproved: { backgroundColor: COLORS.successSoft },
  approvalRejected: { backgroundColor: COLORS.dangerSoft },
  approvalText: { color: COLORS.textPrimary, flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  profileCard: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 18, borderWidth: 1, padding: 20, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, width: '100%' },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginBottom: 6, marginTop: 18, textTransform: 'uppercase' },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginBottom: 4 },
  name: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  editHint: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  nameEditRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 4, width: '100%' },
  nameInput: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, color: COLORS.textPrimary, flex: 1, padding: 13 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13 },
  saveText: { color: COLORS.textOnPrimary, fontWeight: '800' },
  email: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 5 },
  id: { color: COLORS.textSecondary, fontSize: 10, marginTop: 6, overflow: 'hidden' },
  actionContainer: { paddingHorizontal: 24 },
});
