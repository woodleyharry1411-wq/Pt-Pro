-- Run this in the Supabase SQL editor

create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid references auth.users not null,
  name          text not null,
  age           int,
  weight        numeric(5,1),
  height        numeric(5,1),
  gender        text,
  goal          text,
  fitness_level text,
  equipment     text,
  days_per_week int,
  injuries      text,
  notes         text,
  programme     jsonb,
  created_at    timestamptz default now()
);

create table if not exists client_sessions (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id) on delete cascade,
  day_label  text,
  note       text,
  created_at timestamptz default now()
);

-- RLS
alter table clients enable row level security;
alter table client_sessions enable row level security;

-- Trainers manage their own clients
create policy "trainer_owns_clients" on clients for all
  using  (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

-- Sessions belong to trainer via client
create policy "trainer_owns_sessions" on client_sessions for all
  using  (exists (select 1 from clients where id = client_id and trainer_id = auth.uid()))
  with check (exists (select 1 from clients where id = client_id and trainer_id = auth.uid()));

-- Index for client portal name lookup
create index if not exists clients_name_idx on clients (lower(name));
