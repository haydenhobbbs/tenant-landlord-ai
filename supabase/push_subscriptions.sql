-- Web Push subscriptions (phone/desktop notifications).
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- Text user IDs also support demo accounts. Server (service role) only; no public policies.
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
