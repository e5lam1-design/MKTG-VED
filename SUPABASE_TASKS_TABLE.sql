-- Marketing Dashboard v1.5 - Main tasks table (Supabase/Postgres)
-- Run this in Supabase SQL editor.

create table if not exists public.tasks (
  id bigserial primary key,
  task_key text not null unique,
  gid text not null,
  stage_label text null,

  -- Common fields across sheets
  name text not null,
  filing_name text null,
  subject text null,
  teacher text null,
  week text null,
  date text null,
  year text null,
  term text null,

  -- Branch / opsheet
  branch text null,
  opsheet text null,
  extra text null,

  -- Operations-specific
  smartboard text null,
  link_bunny text null,
  raw_minutes text null,
  final_minutes text null,
  exact_duration text null,

  -- Stage sheet checks
  check1 boolean not null default false,
  check2 boolean not null default false,

  -- Dashboard edits (overrides)
  editor text null,
  notes_editors text null,
  notes_marketing text null,
  assigned_date text null,
  bunny_link text null,

  done boolean not null default false,
  cancel boolean not null default false,
  priority boolean not null default false,

  raw jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_gid_idx on public.tasks (gid);
create index if not exists tasks_task_key_idx on public.tasks (task_key);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute procedure public.set_updated_at();

alter table public.tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='tasks' and policyname='read_tasks'
  ) then
    create policy read_tasks on public.tasks for select using (true);
  end if;
end $$;

