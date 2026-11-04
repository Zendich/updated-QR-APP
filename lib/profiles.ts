import { supabase } from '@/lib/supabase';

export type Role = 'student' | 'teacher';
export type AccountRole = Role | 'admin';
export type TeacherStatus = 'not_applicable' | 'pending' | 'approved' | 'rejected';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AccountRole;
  course: string | null;
  block: string | null;
  year_level: string | null;
  teacher_status: TeacherStatus;
  created_at: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, course, block, year_level, teacher_status, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function getPendingTeacherApplications(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, course, block, year_level, teacher_status, created_at')
    .eq('role', 'teacher')
    .eq('teacher_status', 'pending')
    .order('created_at', { ascending: true });

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not load teacher requests.');
  }

  return data as Profile[];
}

export async function getTeacherAccounts(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, course, block, year_level, teacher_status, created_at')
    .eq('role', 'teacher')
    .order('created_at', { ascending: true });

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not load teacher accounts.');
  }

  return data as Profile[];
}

export async function setTeacherApplicationStatus(
  userId: string,
  status: Extract<TeacherStatus, 'approved' | 'rejected'>
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ teacher_status: status })
    .eq('id', userId)
    .eq('role', 'teacher')
    .eq('teacher_status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return { error: 'This request is no longer pending.' };
  }

  return { error: null };
}

export async function removeTeacherAccount(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke('delete-teacher-account', {
    body: { userId },
  });

  return { error: error?.message ?? null };
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error?.message ?? null };
}
