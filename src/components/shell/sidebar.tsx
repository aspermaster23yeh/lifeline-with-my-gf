"use client";

import { ProjectIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import { statusFilters, visibleProjects } from "@/lib/domain/filters";
import { isOverdue, progressPercent, tasksForProject } from "@/lib/domain/progress";
import { todayIso } from "@/lib/domain/timeline";
import { CATEGORIES } from "@/lib/domain/types";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function Sidebar() {
  const bundle = useWorkspaceStore((state) => state.bundle);
  const query = useUiStore((state) => state.query);
  const category = useUiStore((state) => state.category);
  const status = useUiStore((state) => state.status);
  const view = useUiStore((state) => state.view);
  const selectedId = useUiStore((state) => state.selectedProjectId);
  const setQuery = useUiStore((state) => state.setQuery);
  const setCategory = useUiStore((state) => state.setCategory);
  const setStatus = useUiStore((state) => state.setStatus);
  const setView = useUiStore((state) => state.setView);
  const selectProject = useUiStore((state) => state.selectProject);
  const requestViewport = useUiStore((state) => state.requestViewport);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);

  const projects = bundle
    ? visibleProjects(bundle, { query, category, status, year: "all", ownerId: "all" }, todayIso())
    : [];

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="space-y-3 px-3 py-3">
        <Input id="project-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyectos" aria-label="Buscar proyectos" />
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          <Button type="button" size="sm" variant={view === "map" ? "default" : "ghost"} onClick={() => setView("map")}>
            Mapa
          </Button>
          <Button type="button" size="sm" variant={view === "summary" ? "default" : "ghost"} onClick={() => setView("summary")}>
            Resumen
          </Button>
          <Button type="button" size="sm" variant={view === "money" ? "default" : "ghost"} onClick={() => setView("money")}>
            Dinero
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {statusFilters().map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatus(item.id)}
              className={`rounded-full px-2.5 py-1 text-xs ${status === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
            Todas
          </FilterChip>
          {CATEGORIES.map((item) => (
            <FilterChip key={item} active={category === item} onClick={() => setCategory(item)}>
              {CATEGORY_LABEL[item]}
            </FilterChip>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {projects.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">No hay proyectos con este filtro.</p>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => {
              const tasks = tasksForProject(bundle?.tasks ?? [], project.id);
              const overdue = isOverdue(project, todayIso());
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => {
                      selectProject(project.id);
                      if (view === "map") {
                        requestViewport({ type: "project", projectId: project.id });
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left ${selectedId === project.id ? "bg-card shadow-sm" : "hover:bg-background"}`}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: project.color }} />
                    <ProjectIcon icon={project.icon} className="size-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{project.title}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {project.kind === "activity" ? "Actividad · " : ""}
                        {STATUS_LABEL[project.status]}
                        {overdue ? " · Vencido" : ""} · {progressPercent(tasks)}%
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-sidebar-border p-3">
        <Button type="button" variant="outline" className="w-full" onClick={() => setSettingsOpen(true)}>
          Espacio compartido
        </Button>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2 py-1 text-[11px] ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background"}`}
    >
      {children}
    </button>
  );
}
