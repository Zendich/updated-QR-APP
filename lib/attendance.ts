import { getEventByCode } from '@/lib/events';
import { parseQRPayload } from '@/lib/qr';
import { supabase } from '@/lib/supabase';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    displayName: string;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

type EventRow = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
};

type EventAttendeeRow = {
  event_id: string;
  student_id: string;
  full_name: string | null;
  scanned_at: string;
};

type EventPayload = {
  v: number;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

type DatabaseEvent = {
  id: string;
  title: string;
};

type StudentAttendanceRow = {
  id: string;
  scanned_at: string;
  events:
    | {
        event_code: string;
        title: string;
      }
    | {
        event_code: string;
        title: string;
      }[]
    | null;
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) {
    return { success: false, message: parsed.message };
  }

  const payload = parsed.payload as EventPayload;

  const now = Date.now();
  const start = payload.start ? new Date(payload.start).getTime() : null;
  const end = payload.end ? new Date(payload.end).getTime() : null;

  if (start && now < start) {
    return { success: false, message: 'Event has not started yet.' };
  }
  if (end && now > end) {
    return { success: false, message: 'Event has already ended.' };
  }

  const title = payload.title ?? payload.event;
  let event: { id: string; title: string } | null = null;

  const foundEvent = await getEventByCode(payload.event);
  if (foundEvent) {
    event = { id: foundEvent.id, title: foundEvent.title };
  } else {
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        event_code: payload.event,
        title,
        start_time: payload.start ?? null,
        end_time: payload.end ?? null,
        created_by: studentId,
      })
      .select('id, title')
      .single<DatabaseEvent>();

    if (insertError || !newEvent) {
      return { success: false, message: 'Could not create event.' };
    }

    event = newEvent;
  }

  const { error: attendanceError } = await supabase.from('attendance').insert({
    student_id: studentId,
    event_id: event.id,
  });

  if (attendanceError) {
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }
    return { success: false, message: attendanceError.message };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: event.title,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as StudentAttendanceRow[]).map((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    return {
      id: row.id,
      eventId: event?.event_code ?? '',
      eventTitle: event?.title ?? '',
      scannedAt: row.scanned_at,
    };
  });
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    throw new Error(eventError?.message ?? 'Could not load teacher events.');
  }

  return buildEventAttendance(events as EventRow[]);
}

export async function getAllEventAttendance(): Promise<TeacherEventAttendance[]> {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .order('created_at', { ascending: false });

  if (error || !events) {
    throw new Error(error?.message ?? 'Could not load events.');
  }

  return buildEventAttendance(events as EventRow[]);
}

async function buildEventAttendance(typedEvents: EventRow[]): Promise<TeacherEventAttendance[]> {
  const eventIds = typedEvents.map((event) => event.id);
  if (eventIds.length === 0) {
    return [];
  }

  const { data: attendance, error: attendanceError } = await supabase.rpc(
    'get_event_attendance_details',
    { p_event_ids: eventIds }
  );

  if (attendanceError || !attendance) {
    throw new Error(attendanceError?.message ?? 'Could not load event attendees.');
  }

  const typedAttendance = attendance as EventAttendeeRow[];
  return typedEvents.map((event) => {
    const rows = typedAttendance.filter((row) => row.event_id === event.id);
    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: rows.length,
      attendees: rows.map((row) => ({
        studentId: row.student_id,
        displayName: row.full_name?.trim() || 'Name not provided',
        scannedAt: row.scanned_at,
      })),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    return [];
  }

  const eventIds = events.map((event) => event.id);
  if (eventIds.length === 0) {
    return [];
  }

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attendanceError || !attendanceRows) {
    return events.map((event) => ({
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      attendeeCount: 0,
    }));
  }

  const counts: Record<string, number> = {};
  attendanceRows.forEach((row) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}
