"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tasksForProject } from "@/lib/domain/progress";
import type { Task } from "@/lib/domain/types";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

function SortableTask({ task }: { task: Task }) {
  const toggleTask = useWorkspaceStore((state) => state.toggleTask);
  const updateTask = useWorkspaceStore((state) => state.updateTask);
  const askDelete = useUiStore((state) => state.askDelete);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const [title, setTitle] = useState(task.title);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-xl bg-background/70 px-2 py-1.5"
    >
      <button type="button" className="cursor-grab text-muted-foreground" aria-label="Reordenar" {...attributes} {...listeners}>
        <GripVertical className="size-3.5" />
      </button>
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={() => toggleTask(task.id)}
        aria-label={task.status === "done" ? "Reabrir tarea" : "Completar tarea"}
        className="size-4 accent-[var(--today)]"
      />
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          const next = title.trim();
          if (next && next !== task.title) {
            updateTask(task.id, { title: next });
          } else {
            setTitle(task.title);
          }
        }}
        className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}
      />
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label="Eliminar tarea"
        onClick={() => askDelete({ kind: "task", id: task.id, label: task.title })}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

export function TaskList({ projectId }: { projectId: string }) {
  const storedTasks = useWorkspaceStore((state) => state.bundle?.tasks);
  const tasks = useMemo(() => tasksForProject(storedTasks ?? [], projectId), [storedTasks, projectId]);
  const addTask = useWorkspaceStore((state) => state.addTask);
  const reorder = useWorkspaceStore((state) => state.reorderTasks);
  const [draft, setDraft] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const ids = tasks.map((task) => task.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    reorder(projectId, arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {tasks.map((task) => (
              <SortableTask key={task.id} task={task} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {tasks.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay tareas.</p> : null}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const title = draft.trim();
          if (!title) {
            return;
          }
          addTask(projectId, { title, description: "", targetDate: null, assigneeId: null });
          setDraft("");
        }}
      >
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Nueva tarea" />
        <Button type="submit" size="icon" aria-label="Agregar tarea">
          <Plus />
        </Button>
      </form>
    </div>
  );
}
