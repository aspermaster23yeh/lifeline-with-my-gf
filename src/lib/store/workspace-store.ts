"use client";

import { toast } from "sonner";
import { create } from "zustand";

import { getRepository } from "@/lib/data";
import { resetLocalMap } from "@/lib/data/local-repository";
import { AuthRequiredError, ConflictError } from "@/lib/data/repository";
import type { InvitationResult } from "@/lib/data/repository";
import {
  addLifestyle,
  addTask,
  changeStatus,
  connectProjects,
  createProject,
  deleteConnection,
  deleteProject,
  deleteTask,
  inviteByEmail,
  placeProject,
  removeLifestyle,
  renameWorkspace,
  reorderTasks,
  toggleTask,
  updateConnection,
  updateProjectDetails,
  updateTask,
  createId,
} from "@/lib/domain/operations";
import { firstIssue, invitationSchema, lifestyleInputSchema, projectInputSchema, taskInputSchema } from "@/lib/domain/schema";
import type { LifestyleInput, ProjectInput, TaskInput } from "@/lib/domain/schema";
import type { Bundle, ProjectStatus, RelationKind } from "@/lib/domain/types";

type SaveState = "idle" | "saving" | "saved" | "error";

type Frame = {
  label: string;
  before: Bundle;
  after: Bundle;
};

type WorkspaceState = {
  bundle: Bundle | null;
  persisted: Bundle | null;
  ready: boolean;
  authRequired: boolean;
  error: string | null;
  saveState: SaveState;
  undo: Frame[];
  redo: Frame[];
  remotePending: boolean;
  hydrate: () => Promise<void>;
  undoChange: () => void;
  redoChange: () => void;
  createProject: (input: ProjectInput) => string | null;
  updateDetails: (projectId: string, patch: Parameters<typeof updateProjectDetails>[2]) => void;
  placeProject: (projectId: string, placement: { startDate: string; targetDate: string; lane: number }) => void;
  changeStatus: (projectId: string, status: ProjectStatus) => void;
  removeProject: (projectId: string) => void;
  addTask: (projectId: string, input: TaskInput) => void;
  updateTask: (taskId: string, patch: Parameters<typeof updateTask>[2]) => void;
  toggleTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  reorderTasks: (projectId: string, orderedIds: string[]) => void;
  connect: (sourceId: string, targetId: string, relation: RelationKind) => void;
  setRelation: (connectionId: string, relation: RelationKind) => void;
  removeConnection: (connectionId: string) => void;
  renameWorkspace: (name: string) => void;
  addLifestyleCost: (input: LifestyleInput) => void;
  removeLifestyleCost: (id: string) => void;
  invite: (email: string) => string | null;
  restoreExample: () => void;
  signOut: () => Promise<void>;
  acceptInvitation: (token: string) => Promise<InvitationResult>;
};

let timer: ReturnType<typeof setTimeout> | null = null;
let chain: Promise<void> = Promise.resolve();
let ignoreRemoteUntil = 0;
let unsubscribe: (() => void) | null = null;
let hydrateGeneration = 0;

function stamp(): string {
  return new Date().toISOString();
}

function queueSave(): void {
  useWorkspaceStore.setState({ saveState: "saving" });
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    chain = chain.then(() => flush()).catch(() => undefined);
  }, 350);
}

async function flush(): Promise<void> {
  const repo = getRepository();
  const { bundle: next, persisted: baseline } = useWorkspaceStore.getState();
  if (!next || !baseline || next === baseline) {
    useWorkspaceStore.setState({ saveState: "saved" });
    return;
  }
  try {
    const saved = await repo.save(next, baseline);
    ignoreRemoteUntil = Date.now() + 1500;
    const latest = useWorkspaceStore.getState().bundle;
    if (latest === next) {
      useWorkspaceStore.setState({ bundle: saved, persisted: saved, saveState: "saved" });
    } else {
      useWorkspaceStore.setState({ persisted: saved });
      await flush();
    }
    if (useWorkspaceStore.getState().remotePending) {
      useWorkspaceStore.setState({ remotePending: false });
      await reloadFromRemote();
    }
  } catch (error) {
    if (error instanceof ConflictError) {
      try {
        const fresh = await repo.load();
        useWorkspaceStore.setState({
          bundle: fresh,
          persisted: fresh,
          undo: [],
          redo: [],
          saveState: "saved",
        });
        toast.error("Alguien más editó el mapa. Mostramos la versión guardada.");
      } catch (reloadError) {
        useWorkspaceStore.setState({
          saveState: "error",
          error: reloadError instanceof Error ? reloadError.message : "No se pudo recargar.",
        });
      }
      return;
    }
    useWorkspaceStore.setState({ saveState: "error" });
    toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
  }
}

async function reloadFromRemote(): Promise<void> {
  if (Date.now() < ignoreRemoteUntil) {
    return;
  }
  if (useWorkspaceStore.getState().saveState === "saving") {
    useWorkspaceStore.setState({ remotePending: true });
    return;
  }
  try {
    const fresh = await getRepository().load();
    useWorkspaceStore.setState({ bundle: fresh, persisted: fresh, undo: [], redo: [] });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      useWorkspaceStore.setState({ authRequired: true, bundle: null });
    }
  }
}

function commit(
  label: string,
  recipe: (bundle: Bundle) => Bundle,
): void {
  const current = useWorkspaceStore.getState().bundle;
  if (!current) {
    return;
  }
  const next = recipe(current);
  if (next === current) {
    return;
  }
  const { undo } = useWorkspaceStore.getState();
  useWorkspaceStore.setState({
    bundle: next,
    undo: [...undo, { label, before: current, after: next }].slice(-40),
    redo: [],
  });
  queueSave();
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  bundle: null,
  persisted: null,
  ready: false,
  authRequired: false,
  error: null,
  saveState: "idle",
  undo: [],
  redo: [],
  remotePending: false,

  hydrate: async () => {
    const generation = ++hydrateGeneration;
    unsubscribe?.();
    unsubscribe = null;
    try {
      const bundle = await getRepository().load();
      if (generation !== hydrateGeneration) {
        return;
      }
      set({ bundle, persisted: bundle, ready: true, authRequired: false, error: null, saveState: "saved" });
      if (getRepository().mode === "supabase") {
        unsubscribe = getRepository().subscribe(bundle.workspace.id, () => {
          void reloadFromRemote();
        });
      }
    } catch (error) {
      if (generation !== hydrateGeneration) {
        return;
      }
      if (error instanceof AuthRequiredError) {
        set({ ready: true, authRequired: true, bundle: null, error: null });
        return;
      }
      set({
        ready: true,
        error: error instanceof Error ? error.message : "No se pudo abrir el mapa.",
      });
    }
  },

  undoChange: () => {
    const frame = get().undo.at(-1);
    if (!frame) {
      return;
    }
    set({
      bundle: frame.before,
      undo: get().undo.slice(0, -1),
      redo: [...get().redo, frame],
    });
    queueSave();
  },

  redoChange: () => {
    const frame = get().redo.at(-1);
    if (!frame) {
      return;
    }
    set({
      bundle: frame.after,
      redo: get().redo.slice(0, -1),
      undo: [...get().undo, frame],
    });
    queueSave();
  },

  createProject: (input) => {
    const parsed = projectInputSchema.safeParse(input);
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error));
      return null;
    }
    const id = createId();
    commit("crear proyecto", (bundle) => createProject(bundle, parsed.data, stamp(), id, createId()));
    return id;
  },

  updateDetails: (projectId, patch) => {
    commit("editar proyecto", (bundle) => updateProjectDetails(bundle, projectId, patch, stamp()));
  },

  placeProject: (projectId, placement) => {
    commit("mover proyecto", (bundle) => placeProject(bundle, projectId, placement, stamp(), createId()));
  },

  changeStatus: (projectId, status) => {
    commit("cambiar estado", (bundle) => changeStatus(bundle, projectId, status, stamp(), createId()));
  },

  removeProject: (projectId) => {
    commit("eliminar proyecto", (bundle) => deleteProject(bundle, projectId));
  },

  addTask: (projectId, input) => {
    const parsed = taskInputSchema.safeParse(input);
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error));
      return;
    }
    commit("agregar tarea", (bundle) => addTask(bundle, projectId, parsed.data, stamp(), createId()));
  },

  updateTask: (taskId, patch) => {
    commit("editar tarea", (bundle) => updateTask(bundle, taskId, patch, stamp()));
  },

  toggleTask: (taskId) => {
    commit("actualizar tarea", (bundle) => toggleTask(bundle, taskId, stamp(), createId()));
  },

  removeTask: (taskId) => {
    commit("eliminar tarea", (bundle) => deleteTask(bundle, taskId));
  },

  reorderTasks: (projectId, orderedIds) => {
    commit("reordenar tareas", (bundle) => reorderTasks(bundle, projectId, orderedIds, stamp()));
  },

  connect: (sourceId, targetId, relation) => {
    commit("conectar proyectos", (bundle) =>
      connectProjects(bundle, sourceId, targetId, relation, stamp(), createId()),
    );
  },

  setRelation: (connectionId, relation) => {
    commit("cambiar relación", (bundle) => updateConnection(bundle, connectionId, relation));
  },

  removeConnection: (connectionId) => {
    commit("quitar conexión", (bundle) => deleteConnection(bundle, connectionId));
  },

  renameWorkspace: (name) => {
    commit("renombrar espacio", (bundle) => renameWorkspace(bundle, name, stamp()));
  },

  addLifestyleCost: (input) => {
    const parsed = lifestyleInputSchema.safeParse(input);
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error));
      return;
    }
    commit("agregar gasto de vida", (bundle) => addLifestyle(bundle, parsed.data, stamp(), createId()));
  },

  removeLifestyleCost: (id) => {
    commit("quitar gasto de vida", (bundle) => removeLifestyle(bundle, id));
  },

  invite: (email) => {
    const parsed = invitationSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error));
      return null;
    }
    const token = createId();
    const before = get().bundle?.invitations.length ?? 0;
    commit("invitar", (bundle) => inviteByEmail(bundle, parsed.data.email, stamp(), createId(), token));
    const after = get().bundle?.invitations.length ?? 0;
    if (after === before) {
      toast.error("Esa persona ya está invitada o ya pertenece al espacio.");
      return null;
    }
    if (getRepository().mode === "local") {
      toast.message("Invitación guardada solo en este navegador. No hay sincronización real.");
    }
    return token;
  },

  restoreExample: () => {
    if (getRepository().mode !== "local") {
      return;
    }
    const seed = resetLocalMap();
    set({ bundle: seed, persisted: seed, undo: [], redo: [], saveState: "saved" });
  },

  signOut: async () => {
    await getRepository().signOut();
    unsubscribe?.();
    unsubscribe = null;
    set({ bundle: null, persisted: null, authRequired: true, undo: [], redo: [] });
  },

  acceptInvitation: async (token) => getRepository().acceptInvitation(token),
}));

export function useProject(projectId: string | null) {
  return useWorkspaceStore((state) => state.bundle?.projects.find((project) => project.id === projectId) ?? null);
}
