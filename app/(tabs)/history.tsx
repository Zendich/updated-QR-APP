import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { getAttendanceHistory, getTeacherEventAttendance, type AttendanceRecord, type TeacherEventAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) { setLoading(false); setError('Please sign in to view attendance history.'); return; }
    setLoading(true);
    setError(null);
    try {
      const currentRole = (await getProfile(user.id))?.role ?? 'student';
      setRole(currentRole);
      if (currentRole === 'teacher') {
        setTeacherEvents(await getTeacherEventAttendance(user.id));
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}><Ionicons name={role === 'teacher' ? 'clipboard-outline' : 'time-outline'} size={25} color={COLORS.primary} /></View>
        <View><Text style={styles.title}>{role === 'teacher' ? 'My event attendance' : 'Attendance history'}</Text><Text style={styles.subtitle}>{role === 'teacher' ? 'Review events and attendee counts.' : 'Your latest attendance activity.'}</Text></View>
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : error ? <Text style={styles.error}>{error}</Text> : role === 'teacher' ? <TeacherHistory events={teacherEvents} /> : studentRecords.length === 0 ? <EmptyState /> : <FlatList data={studentRecords} contentContainerStyle={styles.list} keyExtractor={(item) => item.id} renderItem={({ item }) => <HistoryCard eventTitle={item.eventTitle} eventCode={item.eventId} scannedAt={item.scannedAt} />} />}
    </SafeAreaView>
  );
}

function HistoryCard({ eventTitle, eventCode, scannedAt }: { eventTitle: string; eventCode: string; scannedAt: string }) {
  return <View style={styles.card}><View style={styles.cardTop}><View style={styles.statusDot} /><Text style={styles.eventTitle}>{eventTitle}</Text></View><Text style={styles.eventMeta}>{eventCode}</Text><Text style={styles.date}>{formatDate(scannedAt)}</Text></View>;
}

function TeacherHistory({ events }: { events: TeacherEventAttendance[] }) {
  if (events.length === 0) return <EmptyState message="You have not created any events yet." />;
  return <FlatList data={events} contentContainerStyle={styles.list} keyExtractor={(item) => item.eventId} renderItem={({ item }) => <View style={styles.card}><View style={styles.cardTop}><View style={styles.statusDot} /><Text style={styles.eventTitle}>{item.title}</Text></View><Text style={styles.countText}>{formatAttendanceHeadline(item.attendeeCount)} have scanned this event.</Text><Text style={styles.eventMeta}>{item.eventCode}</Text>{item.startTime ? <Text style={styles.eventMeta}>Starts: {formatDate(item.startTime)}</Text> : null}{item.attendees.length === 0 ? <Text style={styles.emptyAttendees}>No students have scanned this event.</Text> : item.attendees.map((attendee) => <View key={`${attendee.studentId}-${attendee.scannedAt}`} style={styles.attendeeRow}><Text style={styles.attendeeId}>{shortId(attendee.studentId)}</Text><Text style={styles.eventMeta}>{formatDate(attendee.scannedAt)}</Text></View>)}</View>} />;
}

function EmptyState({ message = 'No records yet. Scan a QR code to register your attendance.' }: { message?: string }) {
  return <View style={styles.emptyContainer}><Ionicons name="calendar-clear-outline" size={34} color={COLORS.textSecondary} /><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>{message}</Text></View>;
}

function formatDate(iso: string) { return new Date(iso).toLocaleString(); }
function formatAttendanceHeadline(count: number) { return count === 1 ? '1 attendee' : `${count} attendees`; }
function shortId(id: string) { return id ? `...${id.slice(-8)}` : 'unknown'; }

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  heading: { alignItems: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 14, margin: 20, padding: 16 },
  headingIcon: { alignItems: 'center', backgroundColor: COLORS.primarySoft, borderRadius: 14, height: 48, justifyContent: 'center', width: 48 },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  loader: { alignSelf: 'center', marginTop: 36 },
  error: { color: COLORS.danger, fontSize: 14, lineHeight: 20, margin: 24, textAlign: 'center' },
  list: { paddingBottom: 28, paddingHorizontal: 20 },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16 },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 6 },
  statusDot: { backgroundColor: COLORS.success, borderRadius: 6, height: 8, width: 8 },
  eventTitle: { color: COLORS.textPrimary, flex: 1, fontSize: 16, fontWeight: '800' },
  eventMeta: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  date: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 12 },
  countText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginBottom: 5 },
  attendeeRow: { alignItems: 'center', borderTopColor: COLORS.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8 },
  attendeeId: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  emptyAttendees: { color: COLORS.textSecondary, fontSize: 12, marginTop: 12 },
  emptyContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 6, marginTop: 14 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
