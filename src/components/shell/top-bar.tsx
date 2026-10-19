"use client";

import { Bell, Minus, PanelLeft, Plus, Redo2, Settings, Undo2 } from "lucide-react";

import { MemberAvatar, timeAgo } from "@/components/people";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getRepository } from "@/lib/data";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function TopBar() {
  const bundle = useWorkspaceStore((state) => state.bundle);
  const saveState = useWorkspaceStore((state) => state.saveState);
  const canUndo = useWorkspaceStore((state) => state.undo.length > 0);
  const canRedo = useWorkspaceStore((state) => state.redo.length > 0);
  const undo = useWorkspaceStore((state) => state.undoChange);
  const redo = useWorkspaceStore((state) => state.redoChange);
  const rename = useWorkspaceStore((state) => state.renameWorkspace);
  const zoom = useUiStore((state) => state.zoom);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const requestViewport = useUiStore((state) => state.requestViewport);
  const setCreateOpen = useUiStore((state) => state.setCreateOpen);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const seenHistoryAt = useUiStore((state) => state.seenHistoryAt);
  const markHistorySeen = useUiStore((state) => state.markHistorySeen);
  const history = bundle?.history ?? [];
  const newest = history[0]?.createdAt ?? null;
  const unseen = Boolean(newest && (!seenHistoryAt || newest > seenHistoryAt));
  const year = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, index) => year - 4 + index);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Mostrar proyectos" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <PanelLeft />
      </Button>
      <div className="min-w-0">
        <p className="font-display text-lg leading-none tracking-tight">Our Life Map</p>
        <input
          aria-label="Nombre del espacio"
          defaultValue={bundle?.workspace.name ?? ""}
          key={bundle?.workspace.name}
          onBlur={(event) => rename(event.target.value)}
          className="w-40 max-w-[40vw] truncate bg-transparent text-xs text-muted-foreground outline-none"
        />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <span className="mr-2 hidden text-xs text-muted-foreground sm:inline">
          {saveState === "saving" ? "Guardando…" : saveState === "error" ? "Error al guardar" : "Guardado"}
          {getRepository().mode === "local" ? " · modo local" : ""}
        </span>
        <select
          aria-label="Ir a un año"
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          defaultValue={year}
          onChange={(event) => requestViewport({ type: "year", year: Number(event.target.value) })}
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" onClick={() => requestViewport({ type: "today" })}>
          Hoy
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Alejar" onClick={() => requestViewport({ type: "zoom-out" })}>
              <Minus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Alejar</TooltipContent>
        </Tooltip>
        <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Acercar" onClick={() => requestViewport({ type: "zoom-in" })}>
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Acercar</TooltipContent>
        </Tooltip>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Deshacer" disabled={!canUndo} onClick={undo}>
          <Undo2 />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Rehacer" disabled={!canRedo} onClick={redo}>
          <Redo2 />
        </Button>
        <Popover onOpenChange={(open) => { if (open && newest) markHistorySeen(newest); }}>
          <PopoverTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Notificaciones" className="relative">
              <Bell />
              {unseen ? <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--today)]" /> : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <p className="mb-2 text-sm font-medium">Actividad</p>
            {history.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay movimientos.</p> : null}
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {history.slice(0, 12).map((entry) => (
                <li key={entry.id} className="text-sm">
                  <p>{entry.summary}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
        <div className="ml-1 flex -space-x-2">
          {bundle?.members.map((member) => (
            <MemberAvatar key={member.userId} member={member} />
          ))}
        </div>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Configuración" onClick={() => setSettingsOpen(true)}>
          <Settings />
        </Button>
        <Button type="button" size="sm" className="rounded-full px-4" onClick={() => setCreateOpen(true)}>
          Proyecto
        </Button>
      </div>
    </header>
  );
}
