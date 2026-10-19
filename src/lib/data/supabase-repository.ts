import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthRequiredError, ConflictError } from "@/lib/data/repository";
import type { InvitationResult, LifeMapRepository, SignUpResult } from "@/lib/data/repository";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Bundle,
  CanvasLayout,
  HistoryEntry,
  Invitation,
  Member,
  Project,
  ProjectConnection,
  Task,
  Workspace,
} from "@/lib/domain/types";

type Stamp = Map<string, string>;

function client(): SupabaseClient {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y la clave pública.");
  }
  return supabase;
}

function assertNoError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

async function updateIfCurrent(
  supabase: SupabaseClient,
  table: string,
  id: string,
  expectedUpdatedAt: string,
  payload: Record<string, unknown>,
  stamps: Stamp,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at")
    .maybeSingle();
  assertNoError(error);
  if (!data?.updated_at) {
    throw new ConflictError();
  }
  stamps.set(id, data.updated_at as string);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function projectPayload(project: Project) {
  return {
    title: project.title,
    description: project.description,
    category: project.category,
    color: project.color,
    icon: project.icon,
    start_date: project.startDate,
    target_date: project.targetDate,
    completed_on: project.completedOn,
    original_target_date: project.originalTargetDate,
    status: project.status,
    priority: project.priority,
    owner_id: project.ownerId,
    notes: project.notes,
    budget: project.budget,
    money_flow: project.moneyFlow === "save" ? "save" : "spend",
  };
}

function taskPayload(task: Task) {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    target_date: task.targetDate,
    assignee_id: task.assigneeId,
    sort_order: task.sortOrder,
    completed_at: task.completedAt,
  };
}

export class SupabaseRepository implements LifeMapRepository {
  readonly mode = "supabase" as const;

  async load(): Promise<Bundle> {
    const supabase = client();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      throw new AuthRequiredError();
    }
    assertNoError(authError);

    const { data: memberships, error: memberError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);
    assertNoError(memberError);

    let workspaceId = memberships?.[0]?.workspace_id as string | undefined;
    if (!workspaceId) {
      workspaceId = crypto.randomUUID();
      const { error: createError } = await supabase.from("workspaces").insert({
        id: workspaceId,
        name: "Nuestro mapa",
        created_by: user.id,
      });
      assertNoError(createError);
      const { error: ownerError } = await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: "owner",
      });
      assertNoError(ownerError);
    }

    const [workspaceRes, membersRes, projectsRes, tasksRes, connectionsRes, layoutsRes, historyRes, invitationsRes] =
      await Promise.all([
        supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
        supabase
          .from("workspace_members")
          .select("workspace_id, user_id, role, profiles(display_name, email, avatar_hue)")
          .eq("workspace_id", workspaceId),
        supabase.from("projects").select("*").eq("workspace_id", workspaceId),
        supabase.from("tasks").select("*, projects!inner(workspace_id)").eq("projects.workspace_id", workspaceId),
        supabase.from("project_connections").select("*").eq("workspace_id", workspaceId),
        supabase
          .from("canvas_layouts")
          .select("*, projects!inner(workspace_id)")
          .eq("projects.workspace_id", workspaceId),
        supabase
          .from("project_history")
          .select("*, projects!inner(workspace_id)")
          .eq("projects.workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        supabase.from("workspace_invitations").select("*").eq("workspace_id", workspaceId),
      ]);

    assertNoError(workspaceRes.error);
    assertNoError(membersRes.error);
    assertNoError(projectsRes.error);
    assertNoError(tasksRes.error);
    assertNoError(connectionsRes.error);
    assertNoError(layoutsRes.error);
    assertNoError(historyRes.error);
    assertNoError(invitationsRes.error);

    const workspaceRow = workspaceRes.data as {
      id: string;
      name: string;
      created_by: string;
      created_at: string;
      updated_at: string;
    };
    const workspace: Workspace = {
      id: workspaceRow.id,
      name: workspaceRow.name,
      createdBy: workspaceRow.created_by,
      createdAt: workspaceRow.created_at,
      updatedAt: workspaceRow.updated_at,
    };

    return {
      workspace,
      viewerId: user.id,
      members: ((membersRes.data ?? []) as MemberQuery[]).map(mapMember),
      projects: ((projectsRes.data ?? []) as ProjectRow[]).map(mapProject),
      tasks: ((tasksRes.data ?? []) as TaskRow[]).map(mapTask),
      connections: ((connectionsRes.data ?? []) as ConnectionRow[]).map(mapConnection),
      layouts: ((layoutsRes.data ?? []) as LayoutRow[]).map(mapLayout),
      history: ((historyRes.data ?? []) as HistoryRow[]).map(mapHistory),
      invitations: ((invitationsRes.data ?? []) as InvitationRow[]).map(mapInvitation),
    };
  }

  async save(next: Bundle, baseline: Bundle): Promise<Bundle> {
    const supabase = client();
    const stamps: Stamp = new Map();
    await diffProjects(supabase, next, baseline, stamps);
    await diffTasks(supabase, next, baseline, stamps);
    await diffConnections(supabase, next, baseline);
    await diffLayouts(supabase, next, baseline, stamps);
    await diffHistory(supabase, next, baseline);
    await diffInvitations(supabase, next, baseline);
    if (next.workspace.name !== baseline.workspace.name) {
      await updateIfCurrent(
        supabase,
        "workspaces",
        next.workspace.id,
        baseline.workspace.updatedAt,
        { name: next.workspace.name },
        stamps,
      );
    }
    await deleteMissing(supabase, "project_history", baseline.history, next.history);
    await deleteMissing(supabase, "tasks", baseline.tasks, next.tasks);
    await deleteMissing(supabase, "project_connections", baseline.connections, next.connections);
    await deleteMissing(supabase, "canvas_layouts", baseline.layouts, next.layouts, "project_id");
    await deleteMissing(supabase, "projects", baseline.projects, next.projects);
    return applyStamps(next, stamps);
  }

  subscribe(workspaceId: string, onRemote: () => void): () => void {
    const supabase = client();
    const channel = supabase
      .channel(`life-map:${workspaceId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `workspace_id=eq.${workspaceId}` },
        onRemote,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, onRemote)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_connections", filter: `workspace_id=eq.${workspaceId}` },
        onRemote,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "canvas_layouts" }, onRemote)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_history" }, onRemote)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_invitations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        onRemote,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await client().auth.signInWithPassword({ email, password });
    assertNoError(error);
  }

  async signUp(email: string, password: string, displayName: string): Promise<SignUpResult> {
    const { data, error } = await client().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    assertNoError(error);
    return { needsConfirmation: !data.session };
  }

  async signOut(): Promise<void> {
    const { error } = await client().auth.signOut();
    assertNoError(error);
  }

  async acceptInvitation(token: string): Promise<InvitationResult> {
    const supabase = client();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user?.email) {
      throw new AuthRequiredError();
    }
    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("id, workspace_id, email, status, expires_at")
      .eq("token", token)
      .maybeSingle();
    assertNoError(error);
    if (!data) {
      return "not-found";
    }
    if (data.email.toLowerCase() !== user.email.toLowerCase()) {
      return "email-mismatch";
    }
    if (data.status !== "pending" || new Date(data.expires_at).getTime() < Date.now()) {
      return "expired";
    }
    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: data.workspace_id,
      user_id: user.id,
      role: "editor",
    });
    assertNoError(memberError);
    const { error: inviteError } = await supabase
      .from("workspace_invitations")
      .update({ status: "accepted" })
      .eq("id", data.id);
    assertNoError(inviteError);
    return "accepted";
  }
}

async function diffProjects(
  supabase: SupabaseClient,
  next: Bundle,
  baseline: Bundle,
  stamps: Stamp,
): Promise<void> {
  const previous = new Map(baseline.projects.map((project) => [project.id, project]));
  for (const project of next.projects) {
    const before = previous.get(project.id);
    if (!before) {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          id: project.id,
          workspace_id: project.workspaceId,
          created_by: project.createdBy,
          ...projectPayload(project),
        })
        .select("updated_at")
        .single();
      assertNoError(error);
      if (!data?.updated_at) {
        throw new Error("Supabase no devolvió la fila creada.");
      }
      stamps.set(project.id, String(data.updated_at));
      continue;
    }
    if (!sameJson(projectPayload(project), projectPayload(before))) {
      await updateIfCurrent(supabase, "projects", project.id, before.updatedAt, projectPayload(project), stamps);
    }
  }
}

async function diffTasks(
  supabase: SupabaseClient,
  next: Bundle,
  baseline: Bundle,
  stamps: Stamp,
): Promise<void> {
  const previous = new Map(baseline.tasks.map((task) => [task.id, task]));
  for (const task of next.tasks) {
    const before = previous.get(task.id);
    if (!before) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ id: task.id, project_id: task.projectId, ...taskPayload(task) })
        .select("updated_at")
        .single();
      assertNoError(error);
      if (!data?.updated_at) {
        throw new Error("Supabase no devolvió la tarea creada.");
      }
      stamps.set(task.id, String(data.updated_at));
      continue;
    }
    if (!sameJson(taskPayload(task), taskPayload(before))) {
      await updateIfCurrent(supabase, "tasks", task.id, before.updatedAt, taskPayload(task), stamps);
    }
  }
}

async function diffConnections(supabase: SupabaseClient, next: Bundle, baseline: Bundle): Promise<void> {
  const previous = new Map(baseline.connections.map((connection) => [connection.id, connection]));
  for (const connection of next.connections) {
    const before = previous.get(connection.id);
    if (!before) {
      const { error } = await supabase.from("project_connections").insert({
        id: connection.id,
        workspace_id: connection.workspaceId,
        source_id: connection.sourceId,
        target_id: connection.targetId,
        relation: connection.relation,
      });
      assertNoError(error);
      continue;
    }
    if (before.relation !== connection.relation) {
      const { error } = await supabase
        .from("project_connections")
        .update({ relation: connection.relation })
        .eq("id", connection.id);
      assertNoError(error);
    }
  }
}

async function diffLayouts(
  supabase: SupabaseClient,
  next: Bundle,
  baseline: Bundle,
  stamps: Stamp,
): Promise<void> {
  const previous = new Map(baseline.layouts.map((layout) => [layout.projectId, layout]));
  for (const layout of next.layouts) {
    const before = previous.get(layout.projectId);
    if (!before) {
      const { data, error } = await supabase
        .from("canvas_layouts")
        .insert({ project_id: layout.projectId, lane: layout.lane })
        .select("updated_at")
        .single();
      assertNoError(error);
      if (!data?.updated_at) {
        throw new Error("Supabase no devolvió la fila del lienzo.");
      }
      stamps.set(layout.projectId, String(data.updated_at));
      continue;
    }
    if (before.lane !== layout.lane) {
      const { data, error } = await supabase
        .from("canvas_layouts")
        .update({ lane: layout.lane })
        .eq("project_id", layout.projectId)
        .eq("updated_at", before.updatedAt)
        .select("updated_at")
        .maybeSingle();
      assertNoError(error);
      if (!data?.updated_at) {
        throw new ConflictError();
      }
      stamps.set(layout.projectId, data.updated_at as string);
    }
  }
}

async function diffHistory(supabase: SupabaseClient, next: Bundle, baseline: Bundle): Promise<void> {
  const known = new Set(baseline.history.map((entry) => entry.id));
  const fresh = next.history.filter((entry) => !known.has(entry.id));
  if (fresh.length === 0) {
    return;
  }
  const { error } = await supabase.from("project_history").insert(
    fresh.map((entry) => ({
      id: entry.id,
      project_id: entry.projectId,
      actor_id: entry.actorId,
      kind: entry.kind,
      summary: entry.summary,
      payload: entry.payload,
    })),
  );
  assertNoError(error);
}

async function diffInvitations(supabase: SupabaseClient, next: Bundle, baseline: Bundle): Promise<void> {
  const known = new Set(baseline.invitations.map((invitation) => invitation.id));
  const fresh = next.invitations.filter((invitation) => !known.has(invitation.id));
  if (fresh.length === 0) {
    return;
  }
  const { error } = await supabase.from("workspace_invitations").insert(
    fresh.map((invitation) => ({
      id: invitation.id,
      workspace_id: invitation.workspaceId,
      email: invitation.email,
      token: invitation.token,
      invited_by: invitation.invitedBy,
      status: invitation.status,
      expires_at: invitation.expiresAt,
    })),
  );
  assertNoError(error);
}

async function deleteMissing(
  supabase: SupabaseClient,
  table: string,
  previous: { id?: string; projectId?: string }[],
  next: { id?: string; projectId?: string }[],
  key: "id" | "project_id" = "id",
): Promise<void> {
  const nextIds = new Set(
    next.map((item) => (key === "project_id" ? item.projectId : item.id)).filter((id): id is string => Boolean(id)),
  );
  const removed = previous
    .map((item) => (key === "project_id" ? item.projectId : item.id))
    .filter((id): id is string => typeof id === "string" && !nextIds.has(id));
  if (removed.length === 0) {
    return;
  }
  const { error } = await supabase.from(table).delete().in(key, removed);
  assertNoError(error);
}

function applyStamps(bundle: Bundle, stamps: Stamp): Bundle {
  if (stamps.size === 0) {
    return bundle;
  }
  return {
    ...bundle,
    workspace: stamps.has(bundle.workspace.id)
      ? { ...bundle.workspace, updatedAt: stamps.get(bundle.workspace.id) ?? bundle.workspace.updatedAt }
      : bundle.workspace,
    projects: bundle.projects.map((project) =>
      stamps.has(project.id) ? { ...project, updatedAt: stamps.get(project.id) ?? project.updatedAt } : project,
    ),
    tasks: bundle.tasks.map((task) =>
      stamps.has(task.id) ? { ...task, updatedAt: stamps.get(task.id) ?? task.updatedAt } : task,
    ),
    layouts: bundle.layouts.map((layout) =>
      stamps.has(layout.projectId)
        ? { ...layout, updatedAt: stamps.get(layout.projectId) ?? layout.updatedAt }
        : layout,
    ),
  };
}

type MemberQuery = {
  workspace_id: string;
  user_id: string;
  role: "owner" | "editor";
  profiles:
    | { display_name: string; email: string; avatar_hue: number }
    | { display_name: string; email: string; avatar_hue: number }[]
    | null;
};

type ProjectRow = {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  category: Project["category"];
  color: string;
  icon: Project["icon"];
  start_date: string;
  target_date: string;
  completed_on: string | null;
  original_target_date: string | null;
  status: Project["status"];
  priority: Project["priority"];
  owner_id: string | null;
  notes: string;
  budget: number | null;
  money_flow?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: Task["status"];
  target_date: string | null;
  assignee_id: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ConnectionRow = {
  id: string;
  workspace_id: string;
  source_id: string;
  target_id: string;
  relation: ProjectConnection["relation"];
  created_at: string;
};

type LayoutRow = { project_id: string; lane: number; updated_at: string };
type HistoryRow = {
  id: string;
  project_id: string;
  actor_id: string | null;
  kind: HistoryEntry["kind"];
  summary: string;
  payload: Record<string, string | number | null>;
  created_at: string;
};
type InvitationRow = {
  id: string;
  workspace_id: string;
  email: string;
  token: string;
  invited_by: string;
  status: Invitation["status"];
  created_at: string;
  expires_at: string;
};

function profileOf(value: MemberQuery["profiles"]): { display_name: string; email: string; avatar_hue: number } | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapMember(row: MemberQuery): Member {
  const profile = profileOf(row.profiles);
  return {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    role: row.role,
    displayName: profile?.display_name || "Sin nombre",
    email: profile?.email || "",
    avatarHue: profile?.avatar_hue ?? 30,
  };
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    category: row.category,
    color: row.color,
    icon: row.icon,
    startDate: row.start_date,
    targetDate: row.target_date,
    completedOn: row.completed_on,
    originalTargetDate: row.original_target_date,
    status: row.status,
    priority: row.priority,
    ownerId: row.owner_id,
    notes: row.notes,
    budget: row.budget === null ? null : Number(row.budget),
    moneyFlow: row.money_flow === "save" ? "save" : "spend",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    targetDate: row.target_date,
    assigneeId: row.assignee_id,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapConnection(row: ConnectionRow): ProjectConnection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceId: row.source_id,
    targetId: row.target_id,
    relation: row.relation,
    createdAt: row.created_at,
  };
}

function mapLayout(row: LayoutRow): CanvasLayout {
  return { projectId: row.project_id, lane: row.lane, updatedAt: row.updated_at };
}

function mapHistory(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    actorId: row.actor_id,
    kind: row.kind,
    summary: row.summary,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  };
}

function mapInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    token: row.token,
    invitedBy: row.invited_by,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}
