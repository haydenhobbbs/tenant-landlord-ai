-- Run this once in the Supabase SQL Editor to create the table the app uses.

create table if not exists public.requests (
  id          text primary key,
  tenant_name text not null,
  unit        text not null,
  title       text not null,
  description text not null,
  category    text not null,
  urgency     text not null,
  status      text not null default 'submitted',
  created_at  timestamptz not null default now(),
  quote       jsonb
);

-- Only the server (using the service role key) can read/write.
alter table public.requests enable row level security;

-- Example row so the landlord page isn't empty on first load.
insert into public.requests (id, tenant_name, unit, title, description, category, urgency, status, quote)
values (
  'seed-1', 'Jordan Lee', 'Apt 3B', 'Kitchen sink leaking',
  'Water drips from under the sink whenever it runs. There''s a puddle in the cabinet.',
  'plumbing', 'high', 'awaiting_approval',
  '{"contractor":{"id":"c1","name":"Rapid Rooter Plumbing","trade":"plumbing","rating":4.8,"phone":"(555) 201-3344"},"price":260,"availableAt":"2026-11-15T17:00:00Z","aiReason":"Rapid Rooter Plumbing handles plumbing jobs, is rated 4.8★, and is free soonest."}'
)
on conflict (id) do nothing;
