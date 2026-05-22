create table if not exists public.vocarush_learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  selected_answer text not null,
  correct_answer text not null,
  is_correct boolean not null,
  subject text not null,
  topic text not null,
  error_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists vocarush_learning_records_user_created_idx
on public.vocarush_learning_records (user_id, created_at desc);

create index if not exists vocarush_learning_records_user_topic_idx
on public.vocarush_learning_records (user_id, topic);

alter table public.vocarush_learning_records enable row level security;

drop policy if exists "vocarush_learning_records_select_own" on public.vocarush_learning_records;
create policy "vocarush_learning_records_select_own"
on public.vocarush_learning_records
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "vocarush_learning_records_insert_own" on public.vocarush_learning_records;
create policy "vocarush_learning_records_insert_own"
on public.vocarush_learning_records
for insert
to authenticated
with check (auth.uid() = user_id);
