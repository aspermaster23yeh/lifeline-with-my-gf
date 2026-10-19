"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function DeleteDialog() {
  const target = useUiStore((state) => state.deleteTarget);
  const clear = useUiStore((state) => state.clearDelete);
  const selectProject = useUiStore((state) => state.selectProject);
  const removeProject = useWorkspaceStore((state) => state.removeProject);
  const removeTask = useWorkspaceStore((state) => state.removeTask);
  const removeConnection = useWorkspaceStore((state) => state.removeConnection);
  const selectedId = useUiStore((state) => state.selectedProjectId);

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open) clear(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar {target?.label}?</DialogTitle>
          <DialogDescription>
            {target?.kind === "project"
              ? "Se quitan sus tareas y conexiones. Puedes deshacerlo en esta sesión."
              : "Puedes deshacerlo mientras no recargues si el cambio todavía está en el historial local de esta sesión."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={clear}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (!target) {
                return;
              }
              if (target.kind === "project") {
                removeProject(target.id);
                if (selectedId === target.id) {
                  selectProject(null);
                }
              }
              if (target.kind === "task") {
                removeTask(target.id);
              }
              if (target.kind === "connection") {
                removeConnection(target.id);
              }
              clear();
            }}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
