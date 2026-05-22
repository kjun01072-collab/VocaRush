create table if not exists public.vocarush_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('student', 'teacher')),
  goal text not null check (goal in ('EJU', 'JLPT', 'TOEIC', 'other')),
  current_level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vocarush_profiles enable row level security;

drop policy if exists "vocarush_profiles_select_own" on public.vocarush_profiles;
create policy "vocarush_profiles_select_own"
on public.vocarush_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "vocarush_profiles_insert_own" on public.vocarush_profiles;
create policy "vocarush_profiles_insert_own"
on public.vocarush_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "vocarush_profiles_update_own" on public.vocarush_profiles;
create policy "vocarush_profiles_update_own"
on public.vocarush_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
