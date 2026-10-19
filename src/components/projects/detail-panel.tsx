"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { ProjectIcon } from "@/components/icons";
import { currency, memberName } from "@/components/people";
import { TaskList } from "@/components/projects/task-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inkOn } from "@/lib/domain/color";
import { CATEGORY_LABEL, ITEM_KIND_LABEL, MONEY_FLOW_LABEL, PRIORITY_LABEL, RELATION_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import { isOverdue, progressPercent, tasksForProject } from "@/lib/domain/progress";
import { formatLongDate, todayIso } from "@/lib/domain/timeline";
import { timeAgo } from "@/components/people";
import {
  CATEGORIES,
  ICON_IDS,
  ITEM_KINDS,
  MONEY_FLOWS,
  PRIORITIES,
  PROJECT_COLORS,
  PROJECT_STATUSES,
  RELATIONS,
  type ProjectStatus,
  type RelationKind,
} from "@/lib/domain/types";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function DetailPanel() {
  const projectId = useUiStore((state) => state.selectedProjectId);
  const project = useWorkspaceStore((state) => state.bundle?.projects.find((item) => item.id === projectId) ?? null);
  const bundle = useWorkspaceStore((state) => state.bundle);
  const selectProject = useUiStore((state) => state.selectProject);
  const showOriginal = useUiStore((state) => state.showOriginalDates);
  const updateDetails = useWorkspaceStore((state) => state.updateDetails);
  const placeProject = useWorkspaceStore((state) => state.placeProject);
  const changeStatus = useWorkspaceStore((state) => state.changeStatus);
  const setRelation = useWorkspaceStore((state) => state.setRelation);
  const askDelete = useUiStore((state) => state.askDelete);
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [title, setTitle] = useState(project?.title ?? "");

  if (!project || !bundle) {
    return null;
  }

  const tasks = tasksForProject(bundle.tasks, project.id);
  const progress = progressPercent(tasks);
  const done = tasks.filter((task) => task.status === "done").length;
  const history = bundle.history.filter((entry) => entry.projectId === project.id);
  const connections = bundle.connections.filter(
    (connection) => connection.sourceId === project.id || connection.targetId === project.id,
  );
  const lane = bundle.layouts.find((layout) => layout.projectId === project.id)?.lane ?? 0;
  const overdue = isOverdue(project, todayIso());

  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-sidebar md:w-[380px]">
      <div className="flex items-start gap-3 border-b border-border px-4 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl" style={{ background: project.color, color: inkOn(project.color) }}>
          <ProjectIcon icon={project.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              const next = title.trim();
              if (next && next !== project.title) {
                updateDetails(project.id, { title: next });
              } else {
                setTitle(project.title);
              }
            }}
            className="w-full bg-transparent text-lg font-semibold tracking-tight outline-none"
            aria-label="Nombre del proyecto"
          />
          <p className="text-xs text-muted-foreground">
            {STATUS_LABEL[project.status]}
            {overdue ? " · Vencido" : ""} · {progress}%
          </p>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Cerrar" onClick={() => selectProject(null)}>
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-1 gap-3 text-sm min-[420px]:grid-cols-2">
          <label className="min-w-0 space-y-1">
            <span className="text-xs text-muted-foreground">Inicio</span>
            <Input
              type="date"
              value={project.startDate}
              onChange={(event) => {
                const startDate = event.target.value;
                if (startDate && startDate <= project.targetDate) {
                  placeProject(project.id, { startDate, targetDate: project.targetDate, lane });
                }
              }}
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-xs text-muted-foreground">Objetivo</span>
            <Input
              type="date"
              value={project.targetDate}
              onChange={(event) => {
                const targetDate = event.target.value;
                if (targetDate && targetDate >= project.startDate) {
                  placeProject(project.id, { startDate: project.startDate, targetDate, lane });
                }
              }}
            />
          </label>
        </div>
        {showOriginal && project.originalTargetDate && project.originalTargetDate !== project.targetDate ? (
          <p className="text-xs text-muted-foreground">Fecha original: {formatLongDate(project.originalTargetDate)}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Estado</span>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={project.status}
              onChange={(event) => changeStatus(project.id, event.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Prioridad</span>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={project.priority}
              onChange={(event) =>
                updateDetails(project.id, { priority: event.target.value as (typeof PRIORITIES)[number] })
              }
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABEL[priority]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Responsable</span>
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
            value={project.ownerId ?? ""}
            onChange={(event) => updateDetails(project.id, { ownerId: event.target.value || null })}
          >
            <option value="">Sin asignar</option>
            {bundle.members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>
              {done} completadas · {tasks.length - done} pendientes
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: project.color }} />
          </div>
          {tasks.length > 0 && progress === 100 && project.status !== "completed" ? (
            <p className="mt-2 text-xs text-muted-foreground">Todas las tareas están listas. El proyecto sigue abierto hasta que cambies su estado.</p>
          ) : null}
        </div>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Tareas</h3>
          <TaskList projectId={project.id} />
        </section>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Notas</span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes !== project.notes) {
                updateDetails(project.id, { notes });
              }
            }}
            rows={4}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Descripción</span>
          <Textarea
            defaultValue={project.description}
            key={project.description}
            rows={2}
            onBlur={(event) => {
              if (event.target.value !== project.description) {
                updateDetails(project.id, { description: event.target.value });
              }
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              aria-label={color.id}
              className={`size-6 rounded-full ${project.color === color.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-sidebar" : ""}`}
              style={{ background: color.value }}
              onClick={() => updateDetails(project.id, { color: color.value })}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {ICON_IDS.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-label={icon}
              className={`grid size-8 place-items-center rounded-lg ${project.icon === icon ? "bg-foreground text-background" : "bg-muted"}`}
              onClick={() => updateDetails(project.id, { icon })}
            >
              <ProjectIcon icon={icon} className="size-4" />
            </button>
          ))}
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Categoría</span>
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2"
            value={project.category}
            onChange={(event) => updateDetails(project.id, { category: event.target.value as (typeof CATEGORIES)[number] })}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABEL[category]}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Presupuesto</span>
            <Input
              type="number"
              min={0}
              defaultValue={project.budget ?? ""}
              key={String(project.budget)}
              placeholder={currency(null)}
              onBlur={(event) => {
                const raw = event.target.value.trim();
                const budget = raw === "" ? null : Math.max(0, Math.round(Number(raw)));
                if (Number.isNaN(budget)) {
                  return;
                }
                if (budget !== project.budget) {
                  updateDetails(project.id, { budget });
                }
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {ITEM_KINDS.map((kind) => (
              <Button
                key={kind}
                type="button"
                size="sm"
                variant={project.kind === kind ? "default" : "ghost"}
                onClick={() => updateDetails(project.id, { kind })}
              >
                {ITEM_KIND_LABEL[kind]}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {MONEY_FLOWS.map((flow) => (
              <Button
                key={flow}
                type="button"
                size="sm"
                variant={project.moneyFlow === flow ? "default" : "ghost"}
                onClick={() => updateDetails(project.id, { moneyFlow: flow })}
              >
                {MONEY_FLOW_LABEL[flow]}
              </Button>
            ))}
          </div>
        </div>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Conexiones</h3>
          {connections.length === 0 ? <p className="text-sm text-muted-foreground">Arrastra desde el punto de una tarjeta hacia otra.</p> : null}
          {connections.map((connection) => {
            const otherId = connection.sourceId === project.id ? connection.targetId : connection.sourceId;
            const other = bundle.projects.find((item) => item.id === otherId);
            return (
              <div key={connection.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{other?.title ?? "Proyecto"}</span>
                <select
                  className="h-8 rounded-lg border border-input bg-transparent px-2"
                  value={connection.relation}
                  onChange={(event) => setRelation(connection.id, event.target.value as RelationKind)}
                  aria-label="Tipo de relación"
                >
                  {RELATIONS.map((relation) => (
                    <option key={relation} value={relation}>
                      {RELATION_LABEL[relation]}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => askDelete({ kind: "connection", id: connection.id, label: other?.title ?? "conexión" })}
                >
                  Quitar
                </Button>
              </div>
            );
          })}
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Historial</h3>
          {history.length === 0 ? <p className="text-sm text-muted-foreground">Sin cambios registrados.</p> : null}
          <ul className="space-y-2">
            {history.map((entry) => (
              <li key={entry.id} className="text-sm">
                <p>{entry.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {memberName(bundle.members, entry.actorId)} · {timeAgo(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <Button
          type="button"
          variant="destructive"
          onClick={() => askDelete({ kind: "project", id: project.id, label: project.title })}
        >
          Eliminar proyecto
        </Button>
      </div>
    </aside>
  );
}
