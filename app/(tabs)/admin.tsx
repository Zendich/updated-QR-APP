import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getPendingTeacherApplications, getProfile, getTeacherAccounts, removeTeacherAccount, setTeacherApplicationStatus, type Profile, type TeacherStatus } from '@/lib/profiles';

type Decision = Extract<TeacherStatus, 'approved' | 'rejected'>;

export default function AdminScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Profile[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [section, setSection] = useState<'requests' | 'teachers'>('requests');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ id: string; status: Decision } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user) {
      setProfile(null);
      setRequests([]);
      setTeachers([]);
      setLoading(false);
      return;
    }

    try {
      const currentProfile = await getProfile(user.id);
      setProfile(currentProfile);
      if (currentProfile?.role !== 'admin') {
        setRequests([]);
        setTeachers([]);
        return;
      }
      const [pendingRequests, teacherAccounts] = await Promise.all([
        getPendingTeacherApplications(),
        getTeacherAccounts(),
      ]);
      setRequests(pendingRequests);
      setTeachers(teacherAccounts);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not load teacher requests.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadRequests(); }, [loadRequests]));

  const applyDecision = async (userId: string, status: Decision) => {
    setWorkingId(userId);
    setError(null);
    try {
      const result = await setTeacherApplicationStatus(userId, status);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRequests((current) => current.filter((request) => request.id !== userId));
      if (status === 'approved') {
        const approvedRequest = requests.find((request) => request.id === userId);
        if (approvedRequest) {
          setTeachers((current) => current.map((teacher) => teacher.id === userId
            ? { ...teacher, teacher_status: 'approved' }
            : teacher));
        }
      }
      setDecision(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not update this request.');
    } finally {
      setWorkingId(null);
    }
  };

  const removeAccount = async (userId: string) => {
    setWorkingId(userId);
    setError(null);
    try {
      const result = await removeTeacherAccount(userId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTeachers((current) => current.filter((teacher) => teacher.id !== userId));
      setRequests((current) => current.filter((request) => request.id !== userId));
      setRemoveTarget(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not remove this account.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}><Ionicons name="shield-checkmark-outline" size={25} color={COLORS.textOnPrimary} /></View>
        <View style={styles.headingText}>
          <Text style={styles.title}>Teacher administration</Text>
          <Text style={styles.subtitle}>Review applications or manage existing teacher accounts.</Text>
        </View>
      </View>

      {!loading && profile?.role === 'admin' ? (
        <View style={styles.sectionSwitch}>
          <Pressable accessibilityRole="button" onPress={() => setSection('requests')} style={[styles.sectionButton, section === 'requests' && styles.sectionButtonActive]}>
            <Text style={[styles.sectionText, section === 'requests' && styles.sectionTextActive]}>Requests ({requests.length})</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setSection('teachers')} style={[styles.sectionButton, section === 'teachers' && styles.sectionButtonActive]}>
            <Text style={[styles.sectionText, section === 'teachers' && styles.sectionTextActive]}>Teachers ({teachers.length})</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : profile?.role !== 'admin' ? (
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={34} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Admin access required</Text>
          <Text style={styles.emptyText}>This screen is available only to an administrator.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {section === 'requests' ? <>
            <Text style={styles.count}>{requests.length} pending {requests.length === 1 ? 'request' : 'requests'}</Text>
            {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={34} color={COLORS.success} />
              <Text style={styles.emptyTitle}>No requests to review</Text>
              <Text style={styles.emptyText}>New teacher registrations will appear here.</Text>
            </View>
            ) : requests.map((request) => (
            <View key={request.id} style={styles.request}>
              <View style={styles.requestHeader}>
                <View style={styles.personIcon}><Ionicons name="person-outline" size={20} color={COLORS.primary} /></View>
                <View style={styles.personDetails}>
                  <Text style={styles.name}>{request.full_name || 'Name not provided'}</Text>
                  <Text style={styles.email}>{request.email}</Text>
                </View>
              </View>
              <Text style={styles.date}>Requested {new Date(request.created_at).toLocaleDateString()}</Text>
              {decision?.id === request.id ? (
                <View style={styles.confirmation}>
                  <Text style={styles.confirmationText}>
                    {decision.status === 'approved' ? 'Approve this teacher account?' : 'Reject this teacher request?'}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable accessibilityRole="button" disabled={workingId === request.id} onPress={() => setDecision(null)} style={styles.cancelButton}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={workingId === request.id} onPress={() => applyDecision(request.id, decision.status)} style={[styles.confirmButton, decision.status === 'rejected' && styles.rejectConfirmButton]}>
                      {workingId === request.id ? <ActivityIndicator color={COLORS.textOnPrimary} /> : <Text style={styles.confirmText}>{decision.status === 'approved' ? 'Confirm approval' : 'Confirm rejection'}</Text>}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" disabled={workingId !== null} onPress={() => setDecision({ id: request.id, status: 'approved' })} style={styles.approveButton}>
                    <Ionicons name="checkmark" size={18} color={COLORS.success} />
                    <Text style={styles.approveText}>Approve</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={workingId !== null} onPress={() => setDecision({ id: request.id, status: 'rejected' })} style={styles.rejectButton}>
                    <Ionicons name="close" size={18} color={COLORS.danger} />
                    <Text style={styles.rejectText}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
            ))}
          </> : <>
            <Text style={styles.count}>{teachers.length} teacher {teachers.length === 1 ? 'account' : 'accounts'}</Text>
            {teachers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={34} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>No teacher accounts</Text>
                <Text style={styles.emptyText}>Teacher registrations will appear here.</Text>
              </View>
            ) : teachers.map((teacher) => (
              <View key={teacher.id} style={styles.request}>
                <View style={styles.requestHeader}>
                  <View style={styles.personIcon}><Ionicons name="person-outline" size={20} color={COLORS.primary} /></View>
                  <View style={styles.personDetails}>
                    <Text style={styles.name}>{teacher.full_name || 'Name not provided'}</Text>
                    <Text style={styles.email}>{teacher.email}</Text>
                  </View>
                </View>
                <View style={styles.teacherMeta}>
                  <Text style={styles.date}>Joined {new Date(teacher.created_at).toLocaleDateString()}</Text>
                  <Text style={[styles.status, teacher.teacher_status === 'approved' ? styles.statusApproved : teacher.teacher_status === 'pending' ? styles.statusPending : styles.statusRejected]}>{teacher.teacher_status}</Text>
                </View>
                {removeTarget === teacher.id ? (
                  <View style={styles.deleteConfirmation}>
                    <Text style={styles.deleteWarning}>Permanently delete this sign-in account? Its profile and attendance records will be deleted. Events it created will remain without an owner. This cannot be undone.</Text>
                    <View style={styles.actions}>
                      <Pressable accessibilityRole="button" disabled={workingId === teacher.id} onPress={() => setRemoveTarget(null)} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" disabled={workingId === teacher.id} onPress={() => removeAccount(teacher.id)} style={styles.deleteButton}>
                        {workingId === teacher.id ? <ActivityIndicator color={COLORS.textOnPrimary} /> : <Text style={styles.deleteText}>Delete permanently</Text>}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable accessibilityRole="button" disabled={workingId !== null} onPress={() => setRemoveTarget(teacher.id)} style={styles.removeButton}>
                    <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                    <Text style={styles.removeText}>Remove account</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  heading: { alignItems: 'center', backgroundColor: COLORS.card, borderBottomColor: COLORS.border, borderBottomWidth: 1, flexDirection: 'row', gap: 14, paddingHorizontal: 20, paddingVertical: 18 },
  headingIcon: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 13, height: 48, justifyContent: 'center', width: 48 },
  headingText: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3 },
  loader: { marginTop: 36 },
  sectionSwitch: { backgroundColor: COLORS.surface, flexDirection: 'row', gap: 4, marginHorizontal: 20, marginTop: 14, padding: 4 },
  sectionButton: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  sectionButtonActive: { backgroundColor: COLORS.card },
  sectionText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  sectionTextActive: { color: COLORS.primary },
  list: { padding: 20, paddingBottom: 36 },
  count: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 12 },
  error: { backgroundColor: COLORS.dangerSoft, borderRadius: 10, color: COLORS.danger, fontSize: 13, lineHeight: 18, marginBottom: 12, padding: 12 },
  request: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 16 },
  requestHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  personIcon: { alignItems: 'center', backgroundColor: COLORS.primarySoft, borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  personDetails: { flex: 1 },
  name: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  email: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  date: { color: COLORS.textSecondary, fontSize: 12, marginTop: 12 },
  teacherMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  status: { borderRadius: 8, fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, textTransform: 'capitalize' },
  statusApproved: { backgroundColor: COLORS.successSoft, color: COLORS.success },
  statusPending: { backgroundColor: COLORS.warningSoft, color: COLORS.warning },
  statusRejected: { backgroundColor: COLORS.dangerSoft, color: COLORS.danger },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  approveButton: { alignItems: 'center', backgroundColor: COLORS.successSoft, borderRadius: 9, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 42, paddingHorizontal: 12 },
  approveText: { color: COLORS.success, fontSize: 13, fontWeight: '800' },
  rejectButton: { alignItems: 'center', backgroundColor: COLORS.dangerSoft, borderRadius: 9, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 42, paddingHorizontal: 12 },
  rejectText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
  confirmation: { backgroundColor: COLORS.surface, borderRadius: 9, marginTop: 14, padding: 12 },
  confirmationText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  cancelButton: { alignItems: 'center', borderColor: COLORS.borderStrong, borderRadius: 9, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 40 },
  cancelText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  confirmButton: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  rejectConfirmButton: { backgroundColor: COLORS.danger },
  confirmText: { color: COLORS.textOnPrimary, fontSize: 12, fontWeight: '800' },
  removeButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: COLORS.dangerSoft, borderRadius: 9, flexDirection: 'row', gap: 7, marginTop: 14, minHeight: 40, paddingHorizontal: 12 },
  removeText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
  deleteConfirmation: { backgroundColor: COLORS.dangerSoft, borderRadius: 9, marginTop: 14, padding: 12 },
  deleteWarning: { color: COLORS.danger, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  deleteButton: { alignItems: 'center', backgroundColor: COLORS.danger, borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  deleteText: { color: COLORS.textOnPrimary, fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 14 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center' },
});