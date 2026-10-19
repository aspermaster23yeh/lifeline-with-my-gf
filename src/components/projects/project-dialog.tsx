"use client";

import { useState } from "react";

import { ProjectIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/domain/labels";
import { firstIssue, projectInputSchema, type ProjectInput } from "@/lib/domain/schema";
import { todayIso } from "@/lib/domain/timeline";
import { CATEGORIES, ICON_IDS, PRIORITIES, PROJECT_COLORS } from "@/lib/domain/types";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

function defaultInput(ownerId: string): ProjectInput {
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = new Date(endYear, endMonth, 0);
  const target = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return {
    title: "",
    description: "",
    category: "personal",
    color: PROJECT_COLORS[0].value,
    icon: "Compass",
    startDate: start,
    targetDate: target,
    status: "planned",
    priority: "medium",
    ownerId,
    budget: null,
    notes: "",
  };
}

export function ProjectDialog() {
  const open = useUiStore((state) => state.createOpen);
  const setOpen = useUiStore((state) => state.setCreateOpen);
  const selectProject = useUiStore((state) => state.selectProject);
  const requestViewport = useUiStore((state) => state.requestViewport);
  const viewerId = useWorkspaceStore((state) => state.bundle?.viewerId ?? null);
  const create = useWorkspaceStore((state) => state.createProject);
  const [draft, setDraft] = useState<ProjectInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = draft ?? (viewerId ? defaultInput(viewerId) : null);

  if (!form) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && viewerId) {
          setDraft(defaultInput(viewerId));
          setError(null);
        }
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>El bloque ocupará los meses reales entre el inicio y la fecha objetivo.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = projectInputSchema.safeParse(form);
            if (!parsed.success) {
              setError(firstIssue(parsed.error));
              return;
            }
            const id = create(parsed.data);
            if (!id) {
              return;
            }
            setOpen(false);
            setDraft(null);
            selectProject(id);
            requestViewport({ type: "project", projectId: id });
          }}
        >
          <Input
            value={form.title}
            onChange={(event) => setDraft({ ...form, title: event.target.value })}
            placeholder="Comprar una casa"
            aria-label="Nombre"
            autoFocus
          />
          <Textarea
            value={form.description}
            onChange={(event) => setDraft({ ...form, description: event.target.value })}
            placeholder="Qué quieren lograr"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Inicio</span>
              <Input type="date" value={form.startDate} onChange={(event) => setDraft({ ...form, startDate: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Objetivo</span>
              <Input type="date" value={form.targetDate} onChange={(event) => setDraft({ ...form, targetDate: event.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={form.category}
              onChange={(event) => setDraft({ ...form, category: event.target.value as ProjectInput["category"] })}
              aria-label="Categoría"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABEL[category]}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={form.priority}
              onChange={(event) => setDraft({ ...form, priority: event.target.value as ProjectInput["priority"] })}
              aria-label="Prioridad"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABEL[priority]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                aria-label={color.id}
                className={`size-6 rounded-full ${form.color === color.value ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                style={{ background: color.value }}
                onClick={() => setDraft({ ...form, color: color.value })}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {ICON_IDS.map((icon) => (
              <button
                key={icon}
                type="button"
                aria-label={icon}
                className={`grid size-8 place-items-center rounded-lg ${form.icon === icon ? "bg-foreground text-background" : "bg-muted"}`}
                onClick={() => setDraft({ ...form, icon })}
              >
                <ProjectIcon icon={icon} className="size-4" />
              </button>
            ))}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit">Crear en el mapa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
