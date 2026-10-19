-- Our Life Map
-- Tenancy is the workspace. Dates live on projects.
-- Vertical placement lives only in canvas_layouts.

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  avatar_hue integer not null default 28 check (avatar_hue between 0 and 360),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null default '',
  category text not null check (category in ('hogar', 'dinero', 'viaje', 'crecimiento', 'negocio', 'evento', 'personal')),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null,
  start_date date not null,
  target_date date not null,
  completed_on date,
  original_target_date date,
  status text not null check (status in ('idea', 'planned', 'in_progress', 'paused', 'completed', 'cancelled')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  owner_id uuid references public.profiles (id) on delete set null,
  notes text not null default '',
  budget numeric(12, 2),
  money_flow text not null default 'spend' check (money_flow in ('spend', 'save')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_dates check (target_date >= start_date),
  constraint projects_budget check (budget is null or budget >= 0)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 140),
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'done')),
  target_date date,
  assignee_id uuid references public.profiles (id) on delete set null,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_id uuid not null references public.projects (id) on delete cascade,
  target_id uuid not null references public.projects (id) on delete cascade,
  relation text not null check (relation in ('enables', 'depends_on', 'related')),
  created_at timestamptz not null default now(),
  constraint connections_not_self check (source_id <> target_id),
  constraint connections_unique unique (source_id, target_id)
);

create table public.canvas_layouts (
  project_id uuid primary key references public.projects (id) on delete cascade,
  lane integer not null default 0 check (lane >= 0),
  updated_at timestamptz not null default now()
);

create table public.project_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('created', 'dates_changed', 'status_changed', 'task', 'restored')),
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index projects_workspace_dates_idx on public.projects (workspace_id, start_date, target_date);
create index tasks_project_order_idx on public.tasks (project_id, sort_order);
create index connections_workspace_idx on public.project_connections (workspace_id);
create index history_project_created_idx on public.project_history (project_id, created_at desc);
create index members_user_idx on public.workspace_members (user_id);
create index invitations_email_idx on public.workspace_invitations (lower(email));

create or replace function private.is_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
  );
$$;

create or replace function private.is_workspace_creator(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace
      and created_by = auth.uid()
  );
$$;

create or replace function private.is_owner(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function private.can_touch_project(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects project
    join public.workspace_members member
      on member.workspace_id = project.workspace_id
    where project.id = target_project
      and member.user_id = auth.uid()
  );
$$;

create or replace function private.shares_workspace(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs
      on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid()
      and theirs.user_id = other_user
  );
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.is_member(uuid) from public;
revoke all on function private.is_workspace_creator(uuid) from public;
revoke all on function private.is_owner(uuid) from public;
revoke all on function private.can_touch_project(uuid) from public;
revoke all on function private.shares_workspace(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.is_workspace_creator(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;
grant execute on function private.can_touch_project(uuid) to authenticated;
grant execute on function private.shares_workspace(uuid) to authenticated;

create or replace function private.protect_profile_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'email is managed by auth';
  end if;
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_hue)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'tu'), '@', 1)),
    floor(random() * 360)::integer
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_touch before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger profiles_email before update on public.profiles
  for each row execute function private.protect_profile_email();
create trigger workspaces_touch before update on public.workspaces
  for each row execute function private.set_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function private.set_updated_at();
create trigger tasks_touch before update on public.tasks
  for each row execute function private.set_updated_at();
create trigger layouts_touch before update on public.canvas_layouts
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.project_connections enable row level security;
alter table public.canvas_layouts enable row level security;
alter table public.project_history enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.shares_workspace(id));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy workspaces_select on public.workspaces
  for select to authenticated
  using (created_by = auth.uid() or private.is_member(id));

create policy workspaces_insert on public.workspaces
  for insert to authenticated
  with check (created_by = auth.uid());

create policy workspaces_update on public.workspaces
  for update to authenticated
  using (private.is_member(id))
  with check (private.is_member(id));

create policy workspaces_delete on public.workspaces
  for delete to authenticated
  using (private.is_owner(id));

create policy members_select on public.workspace_members
  for select to authenticated
  using (private.is_member(workspace_id) or user_id = auth.uid());

create policy members_insert_owner on public.workspace_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and private.is_workspace_creator(workspace_id)
  );

create policy members_insert_invite on public.workspace_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'editor'
    and exists (
      select 1
      from public.workspace_invitations invitation
      where invitation.workspace_id = workspace_members.workspace_id
        and lower(invitation.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and invitation.status = 'pending'
        and invitation.expires_at > now()
    )
  );

create policy invitations_select on public.workspace_invitations
  for select to authenticated
  using (
    private.is_member(workspace_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy invitations_insert on public.workspace_invitations
  for insert to authenticated
  with check (private.is_member(workspace_id) and invited_by = auth.uid());

create policy invitations_update on public.workspace_invitations
  for update to authenticated
  using (
    private.is_member(workspace_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    private.is_member(workspace_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy projects_all on public.projects
  for all to authenticated
  using (private.is_member(workspace_id))
  with check (private.is_member(workspace_id) and created_by = auth.uid() or private.is_member(workspace_id));

create policy tasks_all on public.tasks
  for all to authenticated
  using (private.can_touch_project(project_id))
  with check (private.can_touch_project(project_id));

create policy connections_all on public.project_connections
  for all to authenticated
  using (private.is_member(workspace_id))
  with check (private.is_member(workspace_id));

create policy layouts_all on public.canvas_layouts
  for all to authenticated
  using (private.can_touch_project(project_id))
  with check (private.can_touch_project(project_id));

create policy history_select on public.project_history
  for select to authenticated
  using (private.can_touch_project(project_id));

create policy history_insert on public.project_history
  for insert to authenticated
  with check (private.can_touch_project(project_id));

create policy history_delete on public.project_history
  for delete to authenticated
  using (private.can_touch_project(project_id));

-- projects_all WITH CHECK is too loose because of operator precedence.
-- Recreate it so members can write, and new rows stay inside their workspace.
drop policy projects_all on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (private.is_member(workspace_id));
create policy projects_insert on public.projects
  for insert to authenticated
  with check (private.is_member(workspace_id) and created_by = auth.uid());
create policy projects_update on public.projects
  for update to authenticated
  using (private.is_member(workspace_id))
  with check (private.is_member(workspace_id));
create policy projects_delete on public.projects
  for delete to authenticated
  using (private.is_member(workspace_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.projects,
      public.tasks,
      public.project_connections,
      public.canvas_layouts,
      public.project_history,
      public.workspace_invitations;
  end if;
end $$;

revoke all on table
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.workspace_invitations,
  public.projects,
  public.tasks,
  public.project_connections,
  public.canvas_layouts,
  public.project_history
from anon, public;

grant select, insert, update, delete on table
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.workspace_invitations,
  public.projects,
  public.tasks,
  public.project_connections,
  public.canvas_layouts,
  public.project_history
to authenticated;
