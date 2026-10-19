"use client";

import { LifeMap } from "@/components/canvas/life-map";
import { DetailPanel } from "@/components/projects/detail-panel";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { MoneyView } from "@/components/projects/money-view";
import { SummaryView } from "@/components/projects/summary-view";
import { DeleteDialog } from "@/components/shell/delete-dialog";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { SettingsDialog } from "@/components/workspace/settings-dialog";
import { LoginScreen } from "@/components/auth/login-screen";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useEffect, useState } from "react";

export function AppShell() {
  const hydrate = useWorkspaceStore((state) => state.hydrate);
  const ready = useWorkspaceStore((state) => state.ready);
  const authRequired = useWorkspaceStore((state) => state.authRequired);
  const error = useWorkspaceStore((state) => state.error);
  const bundle = useWorkspaceStore((state) => state.bundle);
  const view = useUiStore((state) => state.view);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const selectedId = useUiStore((state) => state.selectedProjectId);
  const selectProject = useUiStore((state) => state.selectProject);
  const setView = useUiStore((state) => state.setView);
  const setCreateOpen = useUiStore((state) => state.setCreateOpen);
  const requestViewport = useUiStore((state) => state.requestViewport);
  const undo = useWorkspaceStore((state) => state.undoChange);
  const redo = useWorkspaceStore((state) => state.redoChange);
  const compact = useMedia("(max-width: 767px)");
  const roomForPanel = useMedia("(min-width: 1180px)");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (compact) {
      setSidebarOpen(false);
    }
  }, [compact, setSidebarOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("project-search")?.focus();
        return;
      }
      if (typing) {
        return;
      }
      if (meta && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (event.key === "Escape") {
        selectProject(null);
      }
      if (event.key.toLowerCase() === "t") {
        requestViewport({ type: "today" });
      }
      if (event.key.toLowerCase() === "n") {
        setCreateOpen(true);
      }
      if (event.key === "1") {
        setView("map");
      }
      if (event.key === "2") {
        setView("summary");
      }
      if (event.key === "3") {
        setView("money");
      }
      if (event.key === "+" || event.key === "=") {
        requestViewport({ type: "zoom-in" });
      }
      if (event.key === "-" || event.key === "_") {
        requestViewport({ type: "zoom-out" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo, selectProject, requestViewport, setCreateOpen, setView]);

  if (!ready) {
    return <ScreenMessage title="Abriendo el mapa…" body="Preparando los meses y los proyectos." />;
  }
  if (authRequired) {
    return <LoginScreen onSuccess={() => void hydrate()} />;
  }
  if (error || !bundle) {
    return <ScreenMessage title="No se pudo abrir el mapa" body={error ?? "Inténtalo de nuevo."} />;
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {!compact && sidebarOpen ? (
          <div className="hidden w-72 shrink-0 border-r border-border md:block">
            <Sidebar />
          </div>
        ) : null}
        <Sheet open={compact && sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Proyectos</SheetTitle>
            </SheetHeader>
            <Sidebar />
          </SheetContent>
        </Sheet>
        <main className="flex min-w-0 flex-1">
          {view === "map" ? <LifeMap /> : view === "money" ? <MoneyView /> : <SummaryView />}
          {selectedId && roomForPanel ? <DetailPanel key={selectedId} /> : null}
        </main>
      </div>
      {selectedId && !roomForPanel ? (
        <div className={compact ? "fixed inset-0 z-30 bg-background" : "fixed top-14 right-0 bottom-0 z-30 w-[380px] border-l border-border bg-background shadow-xl"}>
          <DetailPanel key={selectedId} />
        </div>
      ) : null}
      <ProjectDialog />
      <SettingsDialog />
      <DeleteDialog />
    </div>
  );
}

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function ScreenMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <Button className="mt-4" type="button" variant="outline" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
