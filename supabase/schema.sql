-- Database schema for the app. Already applied to our Supabase project.
-- If you change it, update this file AND tell the team.
--
-- Who uses what:
--   profiles, properties, leases ........ Teammate A (login) + B (landlord)
--   contractors (landlord's trusted list)  Teammate B (UI) + Hayden (AI ranks them first)
--   requests ............................. everyone (the repair flow)
--   outreach_log ......................... Teammate C (texts/emails/calls to contractors)
--   messages (tenant <-> landlord chat) .. Teammate A + B (Supabase Realtime)
--   notifications ........................ Teammate C

-- ---------- People (2 logins: tenant + landlord) ----------

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  role       text not null check (role in ('tenant', 'landlord')),
  name       text not null default '',
  phone      text,
  email      text,
  created_at timestamptz not null default now()
);

-- When someone signs up, create their profile. Pass the role at sign-up:
--   supabase.auth.signUp({ email, password, options: { data: { role: 'landlord', name: 'Pat' } } })
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'tenant'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Properties + leases ----------

create table if not exists public.properties (
  id          uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles on delete cascade,
  address     text not null,
  city        text not null,
  state       text not null,  -- 2-letter, drives legal guidance
  zip         text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.leases (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties on delete cascade,
  tenant_id    uuid references public.profiles on delete set null,
  unit         text,
  rent_amount  numeric,
  rent_due_day int check (rent_due_day between 1 and 31),
  start_date   date,
  end_date     date,
  file_url     text,  -- uploaded lease PDF (Supabase Storage)
  created_at   timestamptz not null default now()
);

-- ---------- Landlord's trusted (pre-approved) contractors ----------

create table if not exists public.contractors (
  id          uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles on delete cascade,
  name        text not null,
  trade       text not null,  -- plumbing | electrical | hvac | appliance | pest | general
  phone       text,
  email       text,
  website     text,
  rating      numeric,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------- Repair requests ----------

create table if not exists public.requests (
  id             text primary key,
  created_at     timestamptz not null default now(),
  tenant_id      uuid references public.profiles on delete set null,
  landlord_id    uuid references public.profiles on delete set null,
  tenant_name    text not null,
  unit           text not null,
  property       jsonb,                       -- { address, city, state, zip }
  title          text not null,
  description    text not null,
  photos         jsonb not null default '[]', -- image URLs
  trade          text,
  urgency        text not null,
  suggestions    jsonb not null default '[]', -- ContractorOffer[] (best first)
  legal_guidance jsonb,                       -- LegalGuidance
  selected       jsonb,                       -- the ContractorOffer the landlord approved
  scheduled_at   timestamptz,
  status         text not null default 'submitted'
    check (status in ('submitted','finding_contractor','contractor_suggested','landlord_approved','scheduled','completed','declined'))
);

-- Every text/email/call to or from a contractor.
create table if not exists public.outreach_log (
  id         uuid primary key default gen_random_uuid(),
  request_id text not null references public.requests on delete cascade,
  contractor jsonb not null,
  channel    text not null check (channel in ('sms','email','call')),
  direction  text not null check (direction in ('outbound','inbound')),
  body       text not null,
  created_at timestamptz not null default now()
);

-- ---------- Chat + notifications ----------

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties on delete cascade,
  request_id  text references public.requests on delete set null,
  sender_id   uuid not null references public.profiles on delete cascade,
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  type       text not null,  -- message | request_update | rent_reminder
  body       text not null,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Security ----------
-- RLS is on for every table, so only the server (service role key) can read
-- or write until policies are added. Whoever builds login + chat should add
-- policies, e.g. "users can read their own profile" and "people on a property
-- can read its messages".
alter table public.profiles      enable row level security;
alter table public.properties    enable row level security;
alter table public.leases        enable row level security;
alter table public.contractors   enable row level security;
alter table public.requests      enable row level security;
alter table public.outreach_log  enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;
