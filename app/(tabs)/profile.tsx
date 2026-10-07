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
    try { await signOut(); router.replace('/login'); }
    catch (error) { Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out.'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading}><View style={styles.avatar}><Ionicons name="person-outline" size={30} color={COLORS.textOnPrimary} /></View><View><Text style={styles.title}>My profile</Text><Text style={styles.subtitle}>Manage your account details.</Text></View></View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : <View style={styles.content}>
        <View style={[styles.roleBadge, profile?.role === 'teacher' ? styles.teacherBadge : styles.studentBadge]}><Text style={styles.roleBadgeText}>{profile?.role === 'teacher' ? 'Teacher account' : 'Student account'}</Text></View>
        {editing ? <View style={styles.nameEditRow}><TextInput autoCapitalize="words" onChangeText={setDraftName} placeholder="Full name" placeholderTextColor={COLORS.textSecondary} style={styles.nameInput} value={draftName} /><Pressable disabled={saving} onPress={handleSaveName} style={styles.saveButton}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text></Pressable></View> : <Pressable onPress={() => setEditing(true)} style={styles.nameRow}><Text style={styles.name}>{profile?.full_name || 'Tap to add your name'}</Text><Text style={styles.editHint}>Edit</Text></Pressable>}
        <Text style={styles.email}>{profile?.email ?? user?.email ?? 'Signed-in user'}</Text>
        <Text style={styles.id}>{user?.id}</Text>
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
  roleBadge: { borderRadius: 16, marginBottom: 18, paddingHorizontal: 18, paddingVertical: 9 },
  teacherBadge: { backgroundColor: COLORS.warningSoft },
  studentBadge: { backgroundColor: COLORS.primarySoft },
  roleBadgeText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 10 },
  name: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  editHint: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  nameEditRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 10, width: '100%' },
  nameInput: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, color: COLORS.textPrimary, flex: 1, padding: 13 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13 },
  saveText: { color: COLORS.textOnPrimary, fontWeight: '800' },
  email: { color: COLORS.textSecondary, fontSize: 14, marginTop: 5, textAlign: 'center' },
  id: { color: COLORS.textSecondary, fontSize: 10, marginTop: 8, textAlign: 'center' },
  actionContainer: { paddingHorizontal: 24 },
});
