-- Marketing Dashboard v1.5 - Cross-browser sync schema (Supabase/Postgres)
-- Run this in Supabase SQL editor (Database > SQL) once.
-- These tables store per-task overrides and manually-added tasks in the DB (no localStorage sync).

create table if not exists public.task_overrides (
  scope text not null default 'global',
  task_key text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, task_key)
);

create index if not exists task_overrides_scope_idx on public.task_overrides (scope);

create table if not exists public.manual_tasks (
  scope text not null default 'global',
  unique_key text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, unique_key)
);

create index if not exists manual_tasks_scope_idx on public.manual_tasks (scope);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists task_overrides_set_updated_at on public.task_overrides;
create trigger task_overrides_set_updated_at
before update on public.task_overrides
for each row execute procedure public.set_updated_at();

drop trigger if exists manual_tasks_set_updated_at on public.manual_tasks;
create trigger manual_tasks_set_updated_at
before update on public.manual_tasks
for each row execute procedure public.set_updated_at();

-- RLS (optional): in this project we write via server (service role), so RLS can stay enabled but permissive.
alter table public.task_overrides enable row level security;
alter table public.manual_tasks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='task_overrides' and policyname='read_task_overrides') then
    create policy read_task_overrides on public.task_overrides for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='manual_tasks' and policyname='read_manual_tasks') then
    create policy read_manual_tasks on public.manual_tasks for select using (true);
  end if;
end$$;

-- Helper RPC to merge patches atomically: data = data || patch
create or replace function public.merge_task_override(p_scope text, p_task_key text, p_patch jsonb)
returns public.task_overrides
language plpgsql
as $$
declare
  r public.task_overrides;
begin
  insert into public.task_overrides(scope, task_key, data)
  values (coalesce(p_scope,'global'), p_task_key, coalesce(p_patch,'{}'::jsonb))
  on conflict (scope, task_key)
  do update set data = public.task_overrides.data || excluded.data;

  select * into r
  from public.task_overrides
  where scope = coalesce(p_scope,'global') and task_key = p_task_key;
  return r;
end;
$$;

