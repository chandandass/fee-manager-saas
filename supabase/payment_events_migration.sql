-- FeeManager: harden payment_events for idempotent PayU activation
-- Run once in Supabase → SQL Editor

-- Ensure table exists (safe if already created in schema.sql)
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid references public.institutes(id) on delete set null,
  txnid text not null,
  mihpayid text,
  amount text,
  status text,
  source text,
  raw jsonb,
  created_at timestamptz not null default now()
);

-- Extra columns if table already existed without them
alter table public.payment_events
  add column if not exists source text;

alter table public.payment_events
  add column if not exists raw jsonb;

-- One row per PayU txnid (blocks double activation)
create unique index if not exists payment_events_txnid_unique
  on public.payment_events (txnid);

create index if not exists payment_events_institute_idx
  on public.payment_events (institute_id);

create index if not exists payment_events_created_idx
  on public.payment_events (created_at desc);

-- Optional: also keep monthly price on institutes if not already run
alter table public.institutes
  add column if not exists monthly_price_inr integer not null default 249;

comment on table public.payment_events is
  'PayU (and later gateway) payment log. txnid unique = idempotent plan activation.';
