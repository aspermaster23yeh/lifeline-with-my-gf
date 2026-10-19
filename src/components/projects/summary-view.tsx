"use client";

import { ProjectIcon } from "@/components/icons";
import { memberName } from "@/components/people";
import { inkOn } from "@/lib/domain/color";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import { isOverdue, progressPercent, tasksForProject } from "@/lib/domain/progress";
import { formatShortDate, todayIso, yearOf } from "@/lib/domain/timeline";
import { visibleProjects } from "@/lib/domain/filters";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function SummaryView() {
  const bundle = useWorkspaceStore((state) => state.bundle);
  const query = useUiStore((state) => state.query);
  const category = useUiStore((state) => state.category);
  const status = useUiStore((state) => state.status);
  const year = useUiStore((state) => state.year);
  const ownerId = useUiStore((state) => state.ownerId);
  const selectProject = useUiStore((state) => state.selectProject);
  const setYear = useUiStore((state) => state.setYear);
  const setOwner = useUiStore((state) => state.setOwnerId);

  if (!bundle) {
    return null;
  }

  const projects = visibleProjects(bundle, { query, category, status, year, ownerId }, todayIso()).sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const years = Array.from(
    new Set(bundle.projects.flatMap((project) => [yearOf(project.startDate), yearOf(project.targetDate)])),
  ).sort();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Resumen</h2>
          <p className="text-sm text-muted-foreground">{projects.length} proyectos con los mismos datos del mapa.</p>
        </div>
        <div className="flex gap-2">
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={year === "all" ? "all" : String(year)}
            onChange={(event) => setYear(event.target.value === "all" ? "all" : Number(event.target.value))}
            aria-label="Año"
          >
            <option value="all">Todos los años</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={ownerId}
            onChange={(event) => setOwner(event.target.value)}
            aria-label="Responsable"
          >
            <option value="all">Cualquier persona</option>
            {bundle.members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>
      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Nada coincide con estos filtros.
        </p>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => {
            const tasks = tasksForProject(bundle.tasks, project.id);
            const progress = progressPercent(tasks);
            const overdue = isOverdue(project, todayIso());
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => selectProject(project.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left hover:bg-muted/60"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: project.color, color: inkOn(project.color) }}>
                    <ProjectIcon icon={project.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{project.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatShortDate(project.startDate)} — {formatShortDate(project.targetDate)} · {CATEGORY_LABEL[project.category]} ·{" "}
                      {memberName(bundle.members, project.ownerId)}
                    </span>
                  </span>
                  <span className="hidden w-24 sm:block">
                    <span className="mb-1 block text-right text-xs tabular-nums text-muted-foreground">{progress}%</span>
                    <span className="block h-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full" style={{ width: `${progress}%`, background: project.color }} />
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABEL[project.status]}
                    {overdue ? " · Vencido" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
