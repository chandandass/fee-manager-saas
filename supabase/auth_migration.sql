-- Run once in Supabase SQL Editor (required for teacher email claim)

-- Link Google user → institute
alter table public.institutes
  add column if not exists owner_user_id uuid;

create index if not exists institutes_owner_user_id_idx
  on public.institutes (owner_user_id);

-- Teacher login email (platform owner assigns this)
alter table public.institutes
  add column if not exists email text;

-- One centre per teacher email (nulls allowed multiple times)
create unique index if not exists institutes_email_unique
  on public.institutes (lower(email))
  where email is not null and length(trim(email)) > 0;

-- Optional: backfill nothing — admin re-saves email in UI if needed
