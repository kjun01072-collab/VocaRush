create table if not exists public.vocarush_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('student', 'teacher')),
  goal text not null check (goal in ('EJU', 'JLPT', 'TOEIC', 'TOEFL', 'IELTS', 'BusinessEnglish', 'BusinessJapanese', 'CampusJapanese', 'other')),
  current_level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vocarush_profiles
drop constraint if exists vocarush_profiles_goal_check;

alter table public.vocarush_profiles
add constraint vocarush_profiles_goal_check
check (goal in ('EJU', 'JLPT', 'TOEIC', 'TOEFL', 'IELTS', 'BusinessEnglish', 'BusinessJapanese', 'CampusJapanese', 'other'));

alter table public.vocarush_profiles enable row level security;

drop policy if exists "vocarush_profiles_select_own" on public.vocarush_profiles;
create policy "vocarush_profiles_select_own"
on public.vocarush_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "vocarush_profiles_insert_own" on public.vocarush_profiles;
create policy "vocarush_profiles_insert_own"
on public.vocarush_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "vocarush_profiles_update_own" on public.vocarush_profiles;
create policy "vocarush_profiles_update_own"
on public.vocarush_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
