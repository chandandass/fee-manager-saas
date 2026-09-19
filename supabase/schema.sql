-- FeeManager schema (run in Supabase SQL Editor)
-- Safe to re-run: drops nothing; uses IF NOT EXISTS

create extension if not exists "pgcrypto";

-- Institutes (one coaching centre / teacher account)
create table if not exists public.institutes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text not null,
  phone text not null,
  email text,
  plan text not null default 'trial' check (plan in ('trial', 'basic', 'pro')),
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Batches
create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  name text not null,
  subject text,
  teacher_name text,
  schedule text,
  monthly_fee_default integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists batches_institute_idx on public.batches(institute_id);

-- Students
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  name text not null,
  phone text not null,
  parent_phone text,
  monthly_fee integer not null default 0,
  fee_start_day integer not null default 1 check (fee_start_day >= 1 and fee_start_day <= 28),
  joined_at date not null default current_date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists students_institute_idx on public.students(institute_id);
create index if not exists students_batch_idx on public.students(batch_id);

-- Fee records (one row per student per month)
create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  batch_id uuid,
  student_name text not null,
  month text not null, -- YYYY-MM
  amount integer not null,
  paid_amount integer not null default 0,
  status text not null default 'pending' check (status in ('paid', 'pending', 'partial')),
  paid_at timestamptz,
  notes text,
  snoozed_until date,
  created_at timestamptz not null default now(),
  unique (student_id, month)
);

create index if not exists fees_institute_idx on public.fees(institute_id);
create index if not exists fees_student_idx on public.fees(student_id);
create index if not exists fees_status_idx on public.fees(status);

-- Payment log (PayU)
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid references public.institutes(id) on delete set null,
  txnid text not null,
  mihpayid text,
  amount text,
  status text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_txnid_idx on public.payment_events(txnid);

-- Demo seed (optional — one institute for local testing)
insert into public.institutes (id, name, owner_name, phone, plan, trial_ends_at)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Sharma Tuition Centre',
  'Ramesh Sharma',
  '9876500000',
  'trial',
  now() + interval '7 days'
)
on conflict (id) do nothing;

-- RLS: enable later with auth.uid() mapping.
-- For V1 server routes use service role; keep RLS on but permissive for anon only if needed.
alter table public.institutes enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.fees enable row level security;
alter table public.payment_events enable row level security;

-- Temporary dev policies (replace when Auth is ready)
-- Allow service role full access automatically; these are for anon/authenticated experimentation:
drop policy if exists "dev_institutes_all" on public.institutes;
create policy "dev_institutes_all" on public.institutes for all using (true) with check (true);

drop policy if exists "dev_batches_all" on public.batches;
create policy "dev_batches_all" on public.batches for all using (true) with check (true);

drop policy if exists "dev_students_all" on public.students;
create policy "dev_students_all" on public.students for all using (true) with check (true);

drop policy if exists "dev_fees_all" on public.fees;
create policy "dev_fees_all" on public.fees for all using (true) with check (true);

drop policy if exists "dev_payments_all" on public.payment_events;
create policy "dev_payments_all" on public.payment_events for all using (true) with check (true);
