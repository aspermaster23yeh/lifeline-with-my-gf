import { STATUS_LABEL } from "@/lib/domain/labels";
import { formatLongDate, todayIso } from "@/lib/domain/timeline";
import type {
  Bundle,
  CanvasLayout,
  HistoryEntry,
  HistoryKind,
  Invitation,
  Priority,
  Project,
  ProjectConnection,
  ProjectStatus,
  RelationKind,
  Task,
} from "@/lib/domain/types";
import type { ProjectInput, TaskInput } from "@/lib/domain/schema";

export function createId(): string {
  return crypto.randomUUID();
}

function historyEntry(
  projectId: string,
  actorId: string | null,
  kind: HistoryKind,
  summary: string,
  payload: Record<string, string | number | null>,
  now: string,
  id: string,
): HistoryEntry {
  return { id, projectId, actorId, kind, summary, payload, createdAt: now };
}

function replaceProject(bundle: Bundle, project: Project): Bundle {
  return {
    ...bundle,
    projects: bundle.projects.map((item) => (item.id === project.id ? project : item)),
  };
}

export function laneOf(bundle: Bundle, projectId: string): number {
  return bundle.layouts.find((layout) => layout.projectId === projectId)?.lane ?? 0;
}

export function firstFreeLane(bundle: Bundle, startDate: string, targetDate: string): number {
  const taken = new Set<number>();
  for (const project of bundle.projects) {
    const overlaps = !(project.targetDate < startDate || project.startDate > targetDate);
    if (overlaps) {
      taken.add(laneOf(bundle, project.id));
    }
  }
  let lane = 0;
  while (taken.has(lane)) {
    lane += 1;
  }
  return lane;
}

export function createProject(
  bundle: Bundle,
  input: ProjectInput,
  now: string,
  projectId: string,
  historyId: string,
): Bundle {
  const project: Project = {
    id: projectId,
    workspaceId: bundle.workspace.id,
    title: input.title,
    description: input.description,
    category: input.category,
    color: input.color,
    icon: input.icon,
    startDate: input.startDate,
    targetDate: input.targetDate,
    completedOn: input.status === "completed" ? todayIso(new Date(now)) : null,
    originalTargetDate: null,
    status: input.status,
    priority: input.priority,
    ownerId: input.ownerId,
    notes: input.notes,
    budget: input.budget,
    moneyFlow: input.moneyFlow,
    createdAt: now,
    updatedAt: now,
    createdBy: bundle.viewerId,
  };
  const layout: CanvasLayout = {
    projectId,
    lane: firstFreeLane(bundle, input.startDate, input.targetDate),
    updatedAt: now,
  };
  return {
    ...bundle,
    projects: [...bundle.projects, project],
    layouts: [...bundle.layouts, layout],
    history: [
      historyEntry(projectId, bundle.viewerId, "created", "Proyecto creado", {}, now, historyId),
      ...bundle.history,
    ],
  };
}

export function updateProjectDetails(
  bundle: Bundle,
  projectId: string,
  patch: Partial<
    Pick<
      Project,
      | "title"
      | "description"
      | "category"
      | "color"
      | "icon"
      | "priority"
      | "ownerId"
      | "notes"
      | "budget"
      | "moneyFlow"
    >
  >,
  now: string,
): Bundle {
  const project = bundle.projects.find((item) => item.id === projectId);
  if (!project) {
    return bundle;
  }
  return replaceProject(bundle, { ...project, ...patch, updatedAt: now });
}

export function changeProjectDates(
  bundle: Bundle,
  projectId: string,
  next: { startDate: string; targetDate: string },
  now: string,
  historyId: string,
): Bundle {
  const project = bundle.projects.find((item) => item.id === projectId);
  if (!project) {
    return bundle;
  }
  if (next.targetDate < next.startDate) {
    return bundle;
  }
  if (next.startDate === project.startDate && next.targetDate === project.targetDate) {
    return bundle;
  }
  const originalTargetDate =
    project.originalTargetDate ??
    (next.targetDate !== project.targetDate ? project.targetDate : null);
  const updated: Project = {
    ...project,
    startDate: next.startDate,
    targetDate: next.targetDate,
    originalTargetDate,
    updatedAt: now,
  };
  const summary = `Fecha objetivo: ${formatLongDate(project.targetDate)} → ${formatLongDate(next.targetDate)}`;
  return {
    ...replaceProject(bundle, updated),
    history: [
      historyEntry(
        projectId,
        bundle.viewerId,
        "dates_changed",
        summary,
        {
          previousStart: project.startDate,
          nextStart: next.startDate,
          previousTarget: project.targetDate,
          nextTarget: next.targetDate,
        },
        now,
        historyId,
      ),
      ...bundle.history,
    ],
  };
}

export function setLane(bundle: Bundle, projectId: string, lane: number, now: string): Bundle {
  const nextLane = Math.max(0, Math.round(lane));
  const current = bundle.layouts.find((layout) => layout.projectId === projectId);
  if (current?.lane === nextLane) {
    return bundle;
  }
  if (!bundle.projects.some((project) => project.id === projectId)) {
    return bundle;
  }
  const layouts = current
    ? bundle.layouts.map((layout) =>
        layout.projectId === projectId ? { ...layout, lane: nextLane, updatedAt: now } : layout,
      )
    : [...bundle.layouts, { projectId, lane: nextLane, updatedAt: now }];
  return { ...bundle, layouts };
}

export function placeProject(
  bundle: Bundle,
  projectId: string,
  placement: { startDate: string; targetDate: string; lane: number },
  now: string,
  historyId: string,
): Bundle {
  const withDates = changeProjectDates(
    bundle,
    projectId,
    { startDate: placement.startDate, targetDate: placement.targetDate },
    now,
    historyId,
  );
  return setLane(withDates, projectId, placement.lane, now);
}

export function changeStatus(
  bundle: Bundle,
  projectId: string,
  status: ProjectStatus,
  now: string,
  historyId: string,
  today = todayIso(new Date(now)),
): Bundle {
  const project = bundle.projects.find((item) => item.id === projectId);
  if (!project || project.status === status) {
    return bundle;
  }
  const completedOn = status === "completed" ? (project.completedOn ?? today) : null;
  const updated: Project = { ...project, status, completedOn, updatedAt: now };
  return {
    ...replaceProject(bundle, updated),
    history: [
      historyEntry(
        projectId,
        bundle.viewerId,
        "status_changed",
        `Estado: ${STATUS_LABEL[project.status]} → ${STATUS_LABEL[status]}`,
        { previous: project.status, next: status },
        now,
        historyId,
      ),
      ...bundle.history,
    ],
  };
}

export function deleteProject(bundle: Bundle, projectId: string): Bundle {
  return {
    ...bundle,
    projects: bundle.projects.filter((project) => project.id !== projectId),
    tasks: bundle.tasks.filter((task) => task.projectId !== projectId),
    connections: bundle.connections.filter(
      (connection) => connection.sourceId !== projectId && connection.targetId !== projectId,
    ),
    layouts: bundle.layouts.filter((layout) => layout.projectId !== projectId),
    history: bundle.history.filter((entry) => entry.projectId !== projectId),
  };
}

export function addTask(
  bundle: Bundle,
  projectId: string,
  input: TaskInput,
  now: string,
  taskId: string,
): Bundle {
  if (!bundle.projects.some((project) => project.id === projectId)) {
    return bundle;
  }
  const siblings = bundle.tasks.filter((task) => task.projectId === projectId);
  const sortOrder = siblings.reduce((max, task) => Math.max(max, task.sortOrder), -1) + 1;
  const task: Task = {
    id: taskId,
    projectId,
    title: input.title,
    description: input.description,
    status: "open",
    targetDate: input.targetDate,
    assigneeId: input.assigneeId,
    sortOrder,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return { ...bundle, tasks: [...bundle.tasks, task] };
}

export function updateTask(
  bundle: Bundle,
  taskId: string,
  patch: Partial<Pick<Task, "title" | "description" | "targetDate" | "assigneeId">>,
  now: string,
): Bundle {
  return {
    ...bundle,
    tasks: bundle.tasks.map((task) => (task.id === taskId ? { ...task, ...patch, updatedAt: now } : task)),
  };
}

export function toggleTask(bundle: Bundle, taskId: string, now: string, historyId: string): Bundle {
  const task = bundle.tasks.find((item) => item.id === taskId);
  if (!task) {
    return bundle;
  }
  const done = task.status !== "done";
  const tasks = bundle.tasks.map((item) =>
    item.id === taskId
      ? {
          ...item,
          status: done ? ("done" as const) : ("open" as const),
          completedAt: done ? now : null,
          updatedAt: now,
        }
      : item,
  );
  return {
    ...bundle,
    tasks,
    history: [
      historyEntry(
        task.projectId,
        bundle.viewerId,
        "task",
        done ? `Tarea completada: ${task.title}` : `Tarea reabierta: ${task.title}`,
        { taskId, status: done ? "done" : "open" },
        now,
        historyId,
      ),
      ...bundle.history,
    ],
  };
}

export function deleteTask(bundle: Bundle, taskId: string): Bundle {
  return { ...bundle, tasks: bundle.tasks.filter((task) => task.id !== taskId) };
}

export function reorderTasks(bundle: Bundle, projectId: string, orderedIds: string[], now: string): Bundle {
  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  return {
    ...bundle,
    tasks: bundle.tasks.map((task) =>
      task.projectId === projectId && rank.has(task.id)
        ? { ...task, sortOrder: rank.get(task.id) ?? task.sortOrder, updatedAt: now }
        : task,
    ),
  };
}

export function connectProjects(
  bundle: Bundle,
  sourceId: string,
  targetId: string,
  relation: RelationKind,
  now: string,
  connectionId: string,
): Bundle {
  if (sourceId === targetId) {
    return bundle;
  }
  const exists = bundle.connections.some(
    (connection) => connection.sourceId === sourceId && connection.targetId === targetId,
  );
  if (exists) {
    return bundle;
  }
  if (!bundle.projects.some((project) => project.id === sourceId)) {
    return bundle;
  }
  if (!bundle.projects.some((project) => project.id === targetId)) {
    return bundle;
  }
  const connection: ProjectConnection = {
    id: connectionId,
    workspaceId: bundle.workspace.id,
    sourceId,
    targetId,
    relation,
    createdAt: now,
  };
  return { ...bundle, connections: [...bundle.connections, connection] };
}

export function updateConnection(
  bundle: Bundle,
  connectionId: string,
  relation: RelationKind,
): Bundle {
  return {
    ...bundle,
    connections: bundle.connections.map((connection) =>
      connection.id === connectionId ? { ...connection, relation } : connection,
    ),
  };
}

export function deleteConnection(bundle: Bundle, connectionId: string): Bundle {
  return {
    ...bundle,
    connections: bundle.connections.filter((connection) => connection.id !== connectionId),
  };
}

export function renameWorkspace(bundle: Bundle, name: string, now: string): Bundle {
  const trimmed = name.trim();
  if (!trimmed || trimmed === bundle.workspace.name) {
    return bundle;
  }
  return {
    ...bundle,
    workspace: { ...bundle.workspace, name: trimmed.slice(0, 80), updatedAt: now },
  };
}

export function inviteByEmail(
  bundle: Bundle,
  email: string,
  now: string,
  invitationId: string,
  token: string,
): Bundle {
  const normalized = email.trim().toLowerCase();
  const already = bundle.invitations.some(
    (invitation) => invitation.email === normalized && invitation.status === "pending",
  );
  if (already || bundle.members.some((member) => member.email.toLowerCase() === normalized)) {
    return bundle;
  }
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 14);
  const invitation: Invitation = {
    id: invitationId,
    workspaceId: bundle.workspace.id,
    email: normalized,
    token,
    invitedBy: bundle.viewerId,
    status: "pending",
    createdAt: now,
    expiresAt: expires.toISOString(),
  };
  return { ...bundle, invitations: [invitation, ...bundle.invitations] };
}

export function setPriority(bundle: Bundle, projectId: string, priority: Priority, now: string): Bundle {
  return updateProjectDetails(bundle, projectId, { priority }, now);
}
