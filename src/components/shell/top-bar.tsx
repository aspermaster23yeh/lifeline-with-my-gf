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

  const saveText =
    saveState === "saving" ? "Guardando…" : saveState === "error" ? "Error al guardar" : "Guardado";
  const local = getRepository().mode === "local";

  return (
    <header className="shrink-0 border-b border-border">
      <div className="flex h-14 min-w-0 items-center gap-1.5 px-2 sm:gap-2 sm:px-3">
        <Button type="button" size="icon-sm" variant="ghost" className="shrink-0" aria-label="Mostrar proyectos" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <PanelLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base leading-none tracking-tight sm:text-lg">Our Life Map</p>
          <input
            aria-label="Nombre del espacio"
            defaultValue={bundle?.workspace.name ?? ""}
            key={bundle?.workspace.name}
            onBlur={(event) => rename(event.target.value)}
            className="w-full min-w-0 max-w-40 truncate bg-transparent text-xs text-muted-foreground outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 hidden max-w-36 truncate text-xs text-muted-foreground xl:inline">
            {saveText}
            {local ? " · modo local" : ""}
          </span>
          <div className="hidden items-center gap-1 lg:flex">
            <YearSelect years={years} year={year} onYear={(value) => requestViewport({ type: "year", year: value })} />
            <Button type="button" size="sm" variant="outline" onClick={() => requestViewport({ type: "today" })}>
              Hoy
            </Button>
            <ZoomControls zoom={zoom} onZoom={requestViewport} />
            <HistoryButtons canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo} />
          </div>
          <Popover onOpenChange={(open) => { if (open && newest) markHistorySeen(newest); }}>
            <PopoverTrigger asChild>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Notificaciones" className="relative">
                <Bell />
                {unseen ? <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--today)]" /> : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))]">
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
          <div className="ml-1 hidden -space-x-2 sm:flex">
            {bundle?.members.map((member) => (
              <MemberAvatar key={member.userId} member={member} />
            ))}
          </div>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Configuración" onClick={() => setSettingsOpen(true)}>
            <Settings />
          </Button>
          <Button type="button" size="sm" className="rounded-full px-3 sm:px-4" onClick={() => setCreateOpen(true)}>
            <span className="sm:hidden">Nuevo</span>
            <span className="hidden sm:inline">Proyecto</span>
          </Button>
        </div>
      </div>
      <div className="flex h-11 min-w-0 items-center gap-1 overflow-x-auto border-t border-border px-2 lg:hidden">
        <YearSelect years={years} year={year} onYear={(value) => requestViewport({ type: "year", year: value })} />
        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => requestViewport({ type: "today" })}>
          Hoy
        </Button>
        <ZoomControls zoom={zoom} onZoom={requestViewport} />
        <HistoryButtons canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo} />
        <span className="ml-auto hidden shrink-0 pl-2 text-xs text-muted-foreground min-[420px]:inline">
          {saveText}
        </span>
      </div>
    </header>
  );
}

function YearSelect({ years, year, onYear }: { years: number[]; year: number; onYear: (year: number) => void }) {
  return (
    <select
      aria-label="Ir a un año"
      className="h-8 shrink-0 rounded-lg border border-input bg-transparent px-2 text-sm"
      defaultValue={year}
      onChange={(event) => onYear(Number(event.target.value))}
    >
      {years.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}

function ZoomControls({
  zoom,
  onZoom,
}: {
  zoom: number;
  onZoom: (request: { type: "zoom-in" } | { type: "zoom-out" }) => void;
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Alejar" onClick={() => onZoom({ type: "zoom-out" })}>
            <Minus />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Alejar</TooltipContent>
      </Tooltip>
      <span className="hidden w-10 shrink-0 text-center text-xs tabular-nums text-muted-foreground min-[420px]:inline">{Math.round(zoom * 100)}%</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Acercar" onClick={() => onZoom({ type: "zoom-in" })}>
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Acercar</TooltipContent>
      </Tooltip>
    </>
  );
}

function HistoryButtons({
  canUndo,
  canRedo,
  undo,
  redo,
}: {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}) {
  return (
    <>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Deshacer" disabled={!canUndo} onClick={undo}>
        <Undo2 />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Rehacer" disabled={!canRedo} onClick={redo}>
        <Redo2 />
      </Button>
    </>
  );
}
