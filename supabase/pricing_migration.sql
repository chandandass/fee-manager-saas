-- Per-institute subscription price (default ₹249). Run once in SQL Editor.

alter table public.institutes
  add column if not exists monthly_price_inr integer not null default 249
  check (monthly_price_inr >= 1 and monthly_price_inr <= 99999);

comment on column public.institutes.monthly_price_inr is
  'Subscription price INR per month. Default 249; owner can set custom deal.';
