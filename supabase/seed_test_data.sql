-- FeeManager test seed (VALID UUIDs only — hex 0-9 a-f)
-- Run AFTER schema.sql in Supabase SQL Editor

delete from public.fees where institute_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.students where institute_id = 'a0000000-0000-4000-8000-000000000001';
delete from public.batches where institute_id = 'a0000000-0000-4000-8000-000000000001';

insert into public.institutes (id, name, owner_name, phone, plan, trial_ends_at)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Sharma Tuition Centre',
  'Ramesh Sharma',
  '9876500000',
  'trial',
  now() + interval '7 days'
)
on conflict (id) do update set
  name = excluded.name,
  owner_name = excluded.owner_name,
  phone = excluded.phone;

-- Batches (b is valid hex)
insert into public.batches (id, institute_id, name, subject, teacher_name, schedule, monthly_fee_default, is_active) values
(
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'Class 10 - Maths',
  'Mathematics',
  'Mr. Verma',
  'Mon, Wed, Fri 5-6 PM',
  1500,
  true
),
(
  'b0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Class 12 - Physics',
  'Physics',
  'Mrs. Iyer',
  'Tue, Thu, Sat 6-7 PM',
  2000,
  true
);

-- Students (use c0... — do NOT use letter s)
insert into public.students (
  id, institute_id, batch_id, name, phone, parent_phone,
  monthly_fee, fee_start_day, joined_at, is_active
) values
(
  'c0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'Rahul Sharma',
  '9876543210',
  '9876543211',
  1500,
  1,
  '2025-06-01',
  true
),
(
  'c0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'Priya Patel',
  '9123456780',
  null,
  1500,
  15,
  '2025-07-15',
  true
),
(
  'c0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'Amit Kumar',
  '9988776655',
  null,
  2000,
  1,
  '2025-08-01',
  true
),
(
  'c0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'Sneha Reddy',
  '9765432109',
  '9765432108',
  2000,
  5,
  '2025-09-01',
  true
),
(
  'c0000000-0000-4000-8000-000000000005',
  'a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'Vikram Singh',
  '9811122233',
  null,
  1500,
  1,
  '2025-05-01',
  true
);

with m as (
  select
    to_char(date_trunc('month', now()), 'YYYY-MM') as m0,
    to_char(date_trunc('month', now()) - interval '1 month', 'YYYY-MM') as m1,
    to_char(date_trunc('month', now()) - interval '2 month', 'YYYY-MM') as m2,
    to_char(date_trunc('month', now()) - interval '3 month', 'YYYY-MM') as m3
)
insert into public.fees (
  id, institute_id, student_id, batch_id, student_name,
  month, amount, paid_amount, status, paid_at
)
select * from (
  select
    'f0000000-0000-4000-8000-000000000001'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000001'::uuid,
    'b0000000-0000-4000-8000-000000000001'::uuid,
    'Rahul Sharma', m.m0, 1500, 1500, 'paid', now()
  from m
  union all
  select
    'f0000000-0000-4000-8000-000000000002'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000002'::uuid,
    'b0000000-0000-4000-8000-000000000001'::uuid,
    'Priya Patel', m.m2, 1500, 0, 'pending', null from m
  union all
  select
    'f0000000-0000-4000-8000-000000000003'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000002'::uuid,
    'b0000000-0000-4000-8000-000000000001'::uuid,
    'Priya Patel', m.m1, 1500, 0, 'pending', null from m
  union all
  select
    'f0000000-0000-4000-8000-000000000004'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000002'::uuid,
    'b0000000-0000-4000-8000-000000000001'::uuid,
    'Priya Patel', m.m0, 1500, 0, 'pending', null from m
  union all
  select
    'f0000000-0000-4000-8000-000000000005'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000003'::uuid,
    'b0000000-0000-4000-8000-000000000002'::uuid,
    'Amit Kumar', m.m1, 2000, 0, 'pending', null from m
  union all
  select
    'f0000000-0000-4000-8000-000000000006'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000003'::uuid,
    'b0000000-0000-4000-8000-000000000002'::uuid,
    'Amit Kumar', m.m0, 2000, 1000, 'partial', null from m
  union all
  select
    'f0000000-0000-4000-8000-000000000007'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000004'::uuid,
    'b0000000-0000-4000-8000-000000000002'::uuid,
    'Sneha Reddy', m.m0, 2000, 0, 'pending', null from m
  union all
  select
    'f0000000-0000-4000-8000-000000000008'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000005'::uuid,
    'b0000000-0000-4000-8000-000000000001'::uuid,
    'Vikram Singh', m.m3, 1500, 0, 'pending', null from m
  union all
  select
    'f0000000-0000-4000-8000-000000000009'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000005'::uuid,
    'b0000000-0000-4000-8000-000000000001'::uuid,
    'Vikram Singh', m.m2, 1500, 500, 'partial', null from m
  union all
  select
    'f0000000-0000-4000-8000-00000000000a'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c0000000-0000-4000-8000-000000000005'::uuid,
    'b0000000-0000-4000-8000-000000000001'::uuid,
    'Vikram Singh', m.m1, 1500, 0, 'pending', null from m
) t;
