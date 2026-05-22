-- VocaRush highlight photo/file extraction setup.
-- Run this once in Supabase SQL Editor before using real extraction.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vocarush-highlight-files',
  'vocarush-highlight-files',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vocarush_highlight_files_select_own" on storage.objects;
create policy "vocarush_highlight_files_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vocarush-highlight-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "vocarush_highlight_files_insert_own" on storage.objects;
create policy "vocarush_highlight_files_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vocarush-highlight-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create table if not exists public.vocarush_highlight_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vocarush_highlight_uploads_user_created_idx
on public.vocarush_highlight_uploads (user_id, created_at desc);

alter table public.vocarush_highlight_uploads enable row level security;

drop policy if exists "vocarush_highlight_uploads_select_own" on public.vocarush_highlight_uploads;
create policy "vocarush_highlight_uploads_select_own"
on public.vocarush_highlight_uploads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "vocarush_highlight_uploads_insert_own" on public.vocarush_highlight_uploads;
create policy "vocarush_highlight_uploads_insert_own"
on public.vocarush_highlight_uploads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "vocarush_highlight_uploads_update_own" on public.vocarush_highlight_uploads;
create policy "vocarush_highlight_uploads_update_own"
on public.vocarush_highlight_uploads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.vocarush_highlight_extracted_words (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.vocarush_highlight_uploads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  reading text not null,
  meaning_ko text not null,
  category text not null default '추출 단어',
  confidence integer not null default 70 check (confidence between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists vocarush_highlight_extracted_words_user_created_idx
on public.vocarush_highlight_extracted_words (user_id, created_at desc);

alter table public.vocarush_highlight_extracted_words enable row level security;

drop policy if exists "vocarush_highlight_extracted_words_select_own" on public.vocarush_highlight_extracted_words;
create policy "vocarush_highlight_extracted_words_select_own"
on public.vocarush_highlight_extracted_words
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "vocarush_highlight_extracted_words_insert_own" on public.vocarush_highlight_extracted_words;
create policy "vocarush_highlight_extracted_words_insert_own"
on public.vocarush_highlight_extracted_words
for insert
to authenticated
with check (auth.uid() = user_id);
