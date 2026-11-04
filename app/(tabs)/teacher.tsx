import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { createEvent } from '@/lib/events';
import { getProfile, type AccountRole, type TeacherStatus } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}
function formatDateTime(date: Date) { return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }

export default function TeacherScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<AccountRole | null>(null);
  const [teacherStatus, setTeacherStatus] = useState<TeacherStatus>('not_applicable');
  const [roleLoading, setRoleLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [editTarget, setEditTarget] = useState<'start' | 'end' | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user) { setRole(null); setTeacherStatus('not_applicable'); setRoleLoading(false); return () => { active = false; }; }
    setRoleLoading(true);
    getProfile(user.id).then((profile) => { if (active) { setRole(profile?.role ?? 'student'); setTeacherStatus(profile?.teacher_status ?? 'not_applicable'); setRoleLoading(false); } }).catch(() => { if (active) { setRole('student'); setTeacherStatus('not_applicable'); setRoleLoading(false); } });
    return () => { active = false; };
  }, [user]));

  const openPicker = (target: 'start' | 'end') => { setEditTarget(target); setEditingPart('date'); };
  const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') { setEditTarget(null); return; }
    if (!selectedDate) return;
    if (Platform.OS === 'android' && editingPart === 'date') {
      const current = editTarget === 'start' ? startDate : endDate;
      const updated = new Date(selectedDate);
      updated.setHours(current.getHours(), current.getMinutes());
      if (editTarget === 'start') setStartDate(updated); else setEndDate(updated);
      setEditingPart('time');
    } else {
      if (editTarget === 'start') setStartDate(selectedDate); else setEndDate(selectedDate);
      setEditTarget(null);
    }
  };
  const addDurationMinutes = (minutes: number) => setEndDate(new Date(startDate.getTime() + minutes * 60 * 1000));
  const canCreateEvents = role === 'admin' || (role === 'teacher' && teacherStatus === 'approved');
  const accessTitle = role === 'teacher' && teacherStatus === 'pending'
    ? 'Request pending'
    : role === 'teacher' && teacherStatus === 'rejected'
      ? 'Request not approved'
      : 'Teachers only';
  const accessMessage = role === 'teacher' && teacherStatus === 'pending'
    ? 'An admin must approve your teacher account before you can create events.'
    : role === 'teacher' && teacherStatus === 'rejected'
      ? 'Your teacher request was rejected. Contact an administrator if you think this is a mistake.'
      : 'Only approved teachers can create events.';

  if (roleLoading) return <SafeAreaView style={styles.lockContainer}><Text style={styles.lockTitle}>Checking your account...</Text><Text style={styles.lockText}>Loading access details.</Text></SafeAreaView>;
  if (!canCreateEvents) return <SafeAreaView style={styles.lockContainer}><Ionicons name="lock-closed-outline" size={56} color={COLORS.primary} /><Text style={styles.lockTitle}>{accessTitle}</Text><Text style={styles.lockText}>{accessMessage}</Text></SafeAreaView>;

  const handleCreateEvent = () => {
    const trimmedTitle = title.trim();
    const trimmedEventId = eventId.trim();
    if (!trimmedTitle || !trimmedEventId) { setMessage('Add an event title and event code.'); return; }
    if (startDate.getTime() >= endDate.getTime()) { setMessage('Start time must be before end time.'); return; }
    const eventData = { eventId: trimmedEventId, title: trimmedTitle, start: toLocalISO(startDate), end: toLocalISO(endDate) };
    createEvent(eventData).then(({ error }) => {
      if (error) { setMessage(error || 'Could not save the event.'); setPayload(null); return; }
      setMessage('Event saved. Scan its QR code with the Scan tab.');
      setPayload(buildQRPayload(eventData));
    }).catch((caughtError) => { setMessage(caughtError instanceof Error ? caughtError.message : 'Could not save the event.'); setPayload(null); });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.heading}><View style={styles.headingIcon}><Ionicons name="calendar-clear-outline" size={25} color={COLORS.textOnPrimary} /></View><View><Text style={styles.title}>Create event QR</Text><Text style={styles.subtitle}>Share a unique code for students to scan.</Text></View></View>
          <View style={styles.inputContainer}><Ionicons name="create-outline" size={20} color={COLORS.textSecondary} /><TextInput autoCapitalize="words" onChangeText={setTitle} placeholder="e.g. Founders Day Assembly" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={title} /></View>
          <Text style={styles.label}>Event code</Text><View style={styles.inputContainer}><Ionicons name="key-outline" size={20} color={COLORS.textSecondary} /><TextInput autoCapitalize="characters" onChangeText={setEventId} placeholder="e.g. EVT-2026-0002" placeholderTextColor={COLORS.textSecondary} style={styles.input} value={eventId} /></View>
          <Text style={styles.label}>Start time</Text><Pressable accessibilityRole="button" onPress={() => openPicker('start')} style={styles.pickerField}><Ionicons name="sunny-outline" size={20} color={COLORS.textSecondary} /><Text style={styles.pickerText}>{formatDateTime(startDate)}</Text><Ionicons name="chevron-forward-outline" size={18} color={COLORS.textSecondary} /></Pressable>
          <Text style={styles.label}>End time</Text><Pressable accessibilityRole="button" onPress={() => openPicker('end')} style={styles.pickerField}><Ionicons name="moon-outline" size={20} color={COLORS.textSecondary} /><Text style={styles.pickerText}>{formatDateTime(endDate)}</Text><Ionicons name="chevron-forward-outline" size={18} color={COLORS.textSecondary} /></Pressable>
          <View style={styles.chipRow}><Pressable accessibilityRole="button" onPress={() => addDurationMinutes(30)} style={styles.chip}><Text style={styles.chipText}>+30 min</Text></Pressable><Pressable accessibilityRole="button" onPress={() => addDurationMinutes(60)} style={styles.chip}><Text style={styles.chipText}>+1 hour</Text></Pressable><Pressable accessibilityRole="button" onPress={() => addDurationMinutes(120)} style={styles.chip}><Text style={styles.chipText}>+2 hours</Text></Pressable></View>
          {editTarget ? <DateTimePicker display={Platform.OS === 'android' ? 'default' : 'spinner'} mode={Platform.OS === 'android' ? editingPart : 'datetime'} onChange={onPickerChange} value={editTarget === 'start' ? startDate : endDate} /> : null}
          {message ? <View style={styles.messageContainer}><Ionicons name={message.startsWith('Event saved') ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={message.startsWith('Event saved') ? COLORS.success : COLORS.danger} /><Text style={styles.message}>{message}</Text></View> : null}
          <AppButton icon="add-circle-outline" onPress={handleCreateEvent} theme="primary" title="Create Event" />
          {payload ? <View style={styles.resultCard}><Text style={styles.resultTitle}>Scan this QR code with the Scan tab:</Text><View style={styles.qrBox}><QRCode size={200} value={payload} /></View><Text style={styles.payloadText}>{payload}</Text></View> : null}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  heading: { alignItems: 'center', backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 14, marginBottom: 24, padding: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14 },
  headingIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 13, height: 46, justifyContent: 'center', width: 46 },
  title: { color: COLORS.textOnPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 13, marginTop: 3 },
  label: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 7, marginTop: 14 },
  inputContainer: { alignItems: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 3, paddingHorizontal: 14 },
  input: { color: COLORS.textPrimary, flex: 1, fontSize: 15, paddingVertical: 13 },
  pickerField: { alignItems: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerText: { color: COLORS.textPrimary, flex: 1, fontSize: 15, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  chip: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  messageContainer: { alignItems: 'center', backgroundColor: COLORS.successSoft, borderRadius: 12, flexDirection: 'row', gap: 8, marginTop: 14, padding: 12 },
  message: { color: COLORS.success, flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  resultCard: { alignItems: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 16, borderWidth: 1, marginTop: 20, padding: 16 },
  resultTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  qrBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, padding: 12 },
  payloadText: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  lockContainer: { alignItems: 'center', backgroundColor: COLORS.background, flex: 1, justifyContent: 'center', padding: 28 },
  lockTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8, marginTop: 16 },
  lockText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});