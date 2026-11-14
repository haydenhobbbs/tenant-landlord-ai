-- Run separately from schema.sql. Server routes use the service role (bypasses RLS).
create table if not exists public.outreach_messages (
  id text primary key,
  request_id text,
  contractor_id text,
  contractor jsonb,
  channel text,
  direction text,
  to_address text,
  from_address text,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id text primary key,
  user_id text,
  message text,
  kind text,
  request_id text,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.outreach_messages enable row level security;
alter table public.notifications enable row level security;

create index if not exists outreach_messages_to_created_idx
  on public.outreach_messages (to_address, created_at desc);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
