alter table public.projects
  add column if not exists kind text not null default 'project';

alter table public.projects
  drop constraint if exists projects_kind_check;

alter table public.projects
  add constraint projects_kind_check check (kind in ('project', 'activity'));

create table if not exists public.lifestyle_costs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  monthly_amount integer not null check (monthly_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lifestyle_workspace_idx on public.lifestyle_costs (workspace_id, created_at);

drop trigger if exists lifestyle_touch on public.lifestyle_costs;
create trigger lifestyle_touch before update on public.lifestyle_costs
  for each row execute function private.set_updated_at();

alter table public.lifestyle_costs enable row level security;

drop policy if exists lifestyle_select on public.lifestyle_costs;
drop policy if exists lifestyle_insert on public.lifestyle_costs;
drop policy if exists lifestyle_update on public.lifestyle_costs;
drop policy if exists lifestyle_delete on public.lifestyle_costs;

create policy lifestyle_select on public.lifestyle_costs
  for select to authenticated
  using (private.is_member(workspace_id));
create policy lifestyle_insert on public.lifestyle_costs
  for insert to authenticated
  with check (private.is_member(workspace_id));
create policy lifestyle_update on public.lifestyle_costs
  for update to authenticated
  using (private.is_member(workspace_id))
  with check (private.is_member(workspace_id));
create policy lifestyle_delete on public.lifestyle_costs
  for delete to authenticated
  using (private.is_member(workspace_id));

revoke all on table public.lifestyle_costs from anon, public;
grant select, insert, update, delete on table public.lifestyle_costs to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'lifestyle_costs'
     ) then
    alter publication supabase_realtime add table public.lifestyle_costs;
  end if;
end $$;
