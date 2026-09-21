-- Link institutes to Google-signed-in teachers
-- Run in Supabase SQL Editor once

alter table public.institutes
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

alter table public.institutes
  add column if not exists email text;

create index if not exists institutes_owner_user_idx
  on public.institutes(owner_user_id);
