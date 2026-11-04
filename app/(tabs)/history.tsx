import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { getAllEventAttendance, getAttendanceHistory, getTeacherEventAttendance, type AttendanceRecord, type TeacherEventAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { clearEventHistory, deleteEvent } from '@/lib/events';
import { getProfile, type AccountRole, type TeacherStatus } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<AccountRole | null>(null);
  const [teacherStatus, setTeacherStatus] = useState<TeacherStatus>('not_applicable');
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [confirmEventId, setConfirmEventId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) { setLoading(false); setError('Please sign in to view attendance history.'); return; }
    setLoading(true);
    setError(null);
    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';
      setRole(currentRole);
      setTeacherStatus(profile?.teacher_status ?? 'not_applicable');
      if (currentRole === 'teacher' && profile?.teacher_status !== 'approved') {
        setTeacherEvents([]);
        setStudentRecords([]);
      } else if (currentRole === 'teacher' || currentRole === 'admin') {
        setTeacherEvents(currentRole === 'admin'
          ? await getAllEventAttendance()
          : await getTeacherEventAttendance(user.id));
        setStudentRecords([]);
      } else {
        setStudentRecords(await getAttendanceHistory(user.id));
        setTeacherEvents([]);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not load attendance history.');
    } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));
  const managesEvents = role === 'teacher' || role === 'admin';
  const teacherStatusMessage = teacherStatus === 'rejected'
    ? 'Your teacher request was not approved.'
    : 'Your teacher account is waiting for admin approval.';

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingId(eventId);
    setError(null);
    try {
      const result = await deleteEvent(eventId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTeacherEvents((current) => current.filter((event) => event.eventId !== eventId));
      setConfirmEventId(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not delete this event.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearHistory = async () => {
    setClearing(true);
    setError(null);
    try {
      const result = await clearEventHistory();
      if (result.error) {
        setError(result.error);
        return;
      }
      setTeacherEvents([]);
      setConfirmClear(false);
      setConfirmEventId(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not clear event history.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}><Ionicons name={managesEvents ? 'clipboard-outline' : 'time-outline'} size={25} color={COLORS.primary} /></View>
        <View><Text style={styles.title}>{managesEvents ? 'My event attendance' : 'Attendance history'}</Text><Text style={styles.subtitle}>{managesEvents ? 'Review events and attendee counts.' : 'Your latest attendance activity.'}</Text></View>
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : error && !managesEvents ? <Text style={styles.error}>{error}</Text> : role === 'teacher' && teacherStatus !== 'approved' ? <EmptyState message={teacherStatusMessage} /> : managesEvents ? <>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {teacherEvents.length > 0 ? <View style={styles.manageBar}>
          <Text style={styles.eventTotal}>{teacherEvents.length} {teacherEvents.length === 1 ? 'event' : 'events'}</Text>
          <Pressable accessibilityRole="button" disabled={clearing || deletingId !== null} onPress={() => { setConfirmEventId(null); setConfirmClear(true); }} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            <Text style={styles.clearButtonText}>Clear history</Text>
          </Pressable>
        </View> : null}
        {confirmClear ? <View style={styles.confirmPanel}>
          <Text style={styles.confirmTitle}>Clear all event history?</Text>
          <Text style={styles.confirmWarning}>This permanently deletes {teacherEvents.length} {teacherEvents.length === 1 ? 'event' : 'events'} and all attendance records for them. This cannot be undone.</Text>
          <View style={styles.confirmActions}>
            <Pressable accessibilityRole="button" disabled={clearing} onPress={() => setConfirmClear(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={clearing} onPress={handleClearHistory} style={styles.deleteButton}>
              {clearing ? <ActivityIndicator color={COLORS.textOnPrimary} /> : <Text style={styles.deleteText}>Delete all</Text>}
            </Pressable>
          </View>
        </View> : null}
        <TeacherHistory
          events={teacherEvents}
          emptyMessage={role === 'admin' ? 'There are no events to manage.' : 'You have not created any events yet.'}
          confirmEventId={confirmEventId}
          deletingId={deletingId}
          onRequestDelete={(eventId) => { setConfirmClear(false); setConfirmEventId(eventId); }}
          onCancelDelete={() => setConfirmEventId(null)}
          onConfirmDelete={handleDeleteEvent}
        />
      </> : studentRecords.length === 0 ? <EmptyState /> : <FlatList data={studentRecords} contentContainerStyle={styles.list} keyExtractor={(item) => item.id} renderItem={({ item }) => <HistoryCard eventTitle={item.eventTitle} eventCode={item.eventId} scannedAt={item.scannedAt} />} />}
    </SafeAreaView>
  );
}

function HistoryCard({ eventTitle, eventCode, scannedAt }: { eventTitle: string; eventCode: string; scannedAt: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.statusIcon}><Ionicons name="checkmark-circle" size={18} color={COLORS.success} /></View>
        <View style={styles.eventSummary}><Text style={styles.eventTitle}>{eventTitle}</Text><Text style={styles.eventMeta}>{eventCode}</Text></View>
      </View>
      <Text style={styles.date}>{formatDate(scannedAt)}</Text>
    </View>
  );
}

type TeacherHistoryProps = {
  events: TeacherEventAttendance[];
  emptyMessage: string;
  confirmEventId: string | null;
  deletingId: string | null;
  onRequestDelete: (eventId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (eventId: string) => void;
};

function TeacherHistory({ events, emptyMessage, confirmEventId, deletingId, onRequestDelete, onCancelDelete, onConfirmDelete }: TeacherHistoryProps) {
  if (events.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <FlatList
      data={events}
      contentContainerStyle={styles.list}
      keyExtractor={(item) => item.eventId}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.statusIcon}><Ionicons name="calendar" size={18} color={COLORS.primary} /></View>
            <View style={styles.eventSummary}><Text style={styles.eventTitle}>{item.title}</Text><Text style={styles.eventMeta}>{item.eventCode}</Text></View>
          </View>
          <Text style={styles.countText}>{formatAttendanceHeadline(item.attendeeCount)} have scanned this event.</Text>
          {item.startTime ? <Text style={styles.eventMeta}>Starts: {formatDate(item.startTime)}</Text> : null}
          {item.attendees.length === 0 ? <Text style={styles.emptyAttendees}>No students have scanned this event.</Text> : item.attendees.map((attendee) => <View key={`${attendee.studentId}-${attendee.scannedAt}`} style={styles.attendeeRow}><Text style={styles.attendeeId}>{attendee.displayName}</Text><Text style={styles.eventMeta}>{formatDate(attendee.scannedAt)}</Text></View>)}
          {confirmEventId === item.eventId ? (
            <View style={styles.eventConfirmation}>
              <Text style={styles.confirmWarning}>Delete this event and its {item.attendeeCount} attendance {item.attendeeCount === 1 ? 'record' : 'records'} permanently?</Text>
              <View style={styles.confirmActions}>
                <Pressable accessibilityRole="button" disabled={deletingId === item.eventId} onPress={onCancelDelete} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={deletingId === item.eventId} onPress={() => onConfirmDelete(item.eventId)} style={styles.deleteButton}>
                  {deletingId === item.eventId ? <ActivityIndicator color={COLORS.textOnPrimary} /> : <Text style={styles.deleteText}>Delete event</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`} disabled={deletingId !== null} onPress={() => onRequestDelete(item.eventId)} style={styles.eventDeleteButton}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              <Text style={styles.eventDeleteText}>Delete event</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

function EmptyState({ message = 'No records yet. Scan a QR code to register your attendance.' }: { message?: string }) {
  return <View style={styles.emptyContainer}><View style={styles.emptyIcon}><Ionicons name="calendar-clear-outline" size={33} color={COLORS.textSecondary} /></View><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>{message}</Text></View>;
}

function formatDate(iso: string) { return new Date(iso).toLocaleString(); }
function formatAttendanceHeadline(count: number) { return count === 1 ? '1 attendee' : `${count} attendees`; }
const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  heading: { alignItems: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 14, margin: 20, padding: 16 },
  headingIcon: { alignItems: 'center', backgroundColor: COLORS.primarySoft, borderRadius: 14, height: 48, justifyContent: 'center', width: 48 },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  loader: { alignSelf: 'center', marginTop: 36 },
  error: { backgroundColor: COLORS.dangerSoft, borderRadius: 12, color: COLORS.danger, fontSize: 14, lineHeight: 20, margin: 24, padding: 14, textAlign: 'center' },
  list: { paddingBottom: 28, paddingHorizontal: 20 },
  manageBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  eventTotal: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  clearButton: { alignItems: 'center', backgroundColor: COLORS.dangerSoft, borderRadius: 9, flexDirection: 'row', gap: 6, minHeight: 38, paddingHorizontal: 11 },
  clearButtonText: { color: COLORS.danger, fontSize: 12, fontWeight: '800' },
  confirmPanel: { backgroundColor: COLORS.dangerSoft, borderRadius: 12, marginHorizontal: 20, marginTop: 12, padding: 14 },
  confirmTitle: { color: COLORS.danger, fontSize: 15, fontWeight: '800' },
  confirmWarning: { color: COLORS.danger, fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 5 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelButton: { alignItems: 'center', borderColor: COLORS.borderStrong, borderRadius: 9, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 40 },
  cancelText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  deleteButton: { alignItems: 'center', backgroundColor: COLORS.danger, borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  deleteText: { color: COLORS.textOnPrimary, fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10 },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  statusIcon: { alignItems: 'center', backgroundColor: COLORS.primarySoft, borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  eventSummary: { flex: 1 },
  eventTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  eventMeta: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  date: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 12 },
  countText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginBottom: 5, marginTop: 10 },
  attendeeRow: { alignItems: 'center', borderTopColor: COLORS.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8 },
  attendeeId: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  emptyAttendees: { color: COLORS.textSecondary, fontSize: 12, marginTop: 12 },
  eventConfirmation: { backgroundColor: COLORS.dangerSoft, borderRadius: 9, marginTop: 14, padding: 12 },
  eventDeleteButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: COLORS.dangerSoft, borderRadius: 9, flexDirection: 'row', gap: 6, marginTop: 14, minHeight: 38, paddingHorizontal: 11 },
  eventDeleteText: { color: COLORS.danger, fontSize: 12, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 },
  emptyIcon: { alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 20, height: 70, justifyContent: 'center', width: 70 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 6, marginTop: 14 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
