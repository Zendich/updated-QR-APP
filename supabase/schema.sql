-- Safe to run repeatedly in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'student',
  course     text,
  block      text,
  year_level text,
  teacher_status text not null default 'not_applicable',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists teacher_status text not null default 'not_applicable';
alter table public.profiles
  add column if not exists course text;
alter table public.profiles
  add column if not exists block text;
alter table public.profiles
  add column if not exists year_level text;

alter table public.profiles
  drop constraint if exists profiles_course_check;
alter table public.profiles
  add constraint profiles_course_check check (course is null or course in ('BSIT', 'BSHM', 'BEED'));

alter table public.profiles
  drop constraint if exists profiles_block_check;
alter table public.profiles
  add constraint profiles_block_check check (block is null or block in ('A', 'B', 'C', 'D', 'E', 'F'));

alter table public.profiles
  drop constraint if exists profiles_year_level_check;
alter table public.profiles
  add constraint profiles_year_level_check
    check (year_level is null or year_level in ('1st year', '2nd year', '3rd year', '4th year'));

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));

alter table public.profiles
  drop constraint if exists profiles_teacher_status_check;
alter table public.profiles
  add constraint profiles_teacher_status_check
    check (teacher_status in ('not_applicable', 'pending', 'approved', 'rejected'));

update public.profiles
set teacher_status = 'approved'
where role = 'teacher' and teacher_status = 'not_applicable';

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title      text not null,
  start_time timestamptz,
  end_time   timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  unique (student_id, event_id)
);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_approved_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher' and teacher_status = 'approved'
  );
$$;

create or replace function public.can_manage_events()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_approved_teacher();
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_approved_teacher() from public;
revoke all on function public.can_manage_events() from public;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_approved_teacher() to authenticated, service_role;
grant execute on function public.can_manage_events() to authenticated, service_role;

create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null
     and (current_user in ('postgres', 'supabase_admin', 'service_role') or auth.role() = 'service_role') then
    return new;
  end if;

  if auth.uid() = old.id then
    if new.role is distinct from old.role
       or new.teacher_status is distinct from old.teacher_status
       or new.email is distinct from old.email then
      raise exception 'Only an administrator can change account role or teacher approval.';
    end if;
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  raise exception 'You are not allowed to update this profile.';
end;
$$;

drop trigger if exists guard_profile_privileged_fields on public.profiles;
create trigger guard_profile_privileged_fields
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Profiles are viewable by owner or admin" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Users and admins can update permitted profiles" on public.profiles;
drop policy if exists "Events are readable by any authenticated user" on public.events;
drop policy if exists "Users can insert events" on public.events;
drop policy if exists "Users can update their own events" on public.events;
drop policy if exists "Approved teachers can delete their events or admins any" on public.events;
drop policy if exists "Approved teachers and admins can insert events" on public.events;
drop policy if exists "Approved teachers and admins can update their events" on public.events;
drop policy if exists "Students can view their own attendance" on public.attendance;
drop policy if exists "Students can insert their own attendance" on public.attendance;
drop policy if exists "Teachers can view attendance for their events" on public.attendance;
drop policy if exists "Approved teachers and admins can view event attendance" on public.attendance;

create policy "Profiles are viewable by owner or admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "Users and admins can update permitted profiles"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "Events are readable by any authenticated user"
  on public.events for select
  to authenticated
  using (true);

create policy "Approved teachers and admins can insert events"
  on public.events for insert
  to authenticated
  with check (auth.uid() = created_by and public.can_manage_events());

create policy "Approved teachers and admins can update their events"
  on public.events for update
  to authenticated
  using (auth.uid() = created_by and public.can_manage_events())
  with check (auth.uid() = created_by and public.can_manage_events());

create policy "Approved teachers can delete their events or admins any"
  on public.events for delete
  to authenticated
  using (
    public.is_admin()
    or (public.is_approved_teacher() and auth.uid() = created_by)
  );

create policy "Students can view their own attendance"
  on public.attendance for select
  to authenticated
  using (auth.uid() = student_id);

create policy "Students can insert their own attendance"
  on public.attendance for insert
  to authenticated
  with check (auth.uid() = student_id);

create policy "Approved teachers and admins can view event attendance"
  on public.attendance for select
  to authenticated
  using (
    public.is_admin()
    or (
      public.is_approved_teacher()
      and exists (
        select 1
        from public.events
        where public.events.id = attendance.event_id
          and public.events.created_by = auth.uid()
      )
    )
  );

create or replace function public.get_event_attendance_details(p_event_ids uuid[])
returns table (
  event_id uuid,
  student_id uuid,
  full_name text,
  scanned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    attendance.event_id,
    attendance.student_id,
    nullif(btrim(profiles.full_name), ''),
    attendance.scanned_at
  from public.attendance
  join public.events on events.id = attendance.event_id
  left join public.profiles on profiles.id = attendance.student_id
  where events.id = any(coalesce(p_event_ids, '{}'::uuid[]))
    and (
    public.is_admin()
    or (
      public.is_approved_teacher()
      and events.created_by = auth.uid()
    )
    )
  order by attendance.scanned_at desc;
$$;

revoke all on function public.get_event_attendance_details(uuid[]) from public;
grant execute on function public.get_event_attendance_details(uuid[]) to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text;
  initial_teacher_status text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'requested_role' = 'teacher' then 'teacher'
    else 'student'
  end;
  initial_teacher_status := case
    when requested_role = 'teacher' then 'pending'
    else 'not_applicable'
  end;

  insert into public.profiles (id, email, full_name, role, course, block, year_level, teacher_status)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    requested_role,
    case when requested_role = 'student' then new.raw_user_meta_data ->> 'course' end,
    case when requested_role = 'student' then new.raw_user_meta_data ->> 'block' end,
    case when requested_role = 'student' then new.raw_user_meta_data ->> 'year_level' end,
    initial_teacher_status
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
