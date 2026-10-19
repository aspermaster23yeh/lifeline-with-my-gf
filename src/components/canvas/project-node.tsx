"use client";

import { Handle, NodeResizeControl, Position, type Node, type NodeProps } from "@xyflow/react";

import { ProjectIcon } from "@/components/icons";
import { inkOn } from "@/lib/domain/color";
import { STATUS_LABEL } from "@/lib/domain/labels";
import { isOverdue, progressPercent, tasksForProject } from "@/lib/domain/progress";
import { CARD_HEIGHT, formatShortDate, monthWidthContaining, targetDateFromWidth, todayIso } from "@/lib/domain/timeline";
import { laneOf } from "@/lib/domain/operations";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export type ProjectNodeData = { projectId: string };
export type ProjectFlowNode = Node<ProjectNodeData, "project">;

export function ProjectNode({ data, selected }: NodeProps<ProjectFlowNode>) {
  const project = useWorkspaceStore((state) => state.bundle?.projects.find((item) => item.id === data.projectId));
  const taskList = useWorkspaceStore((state) => state.bundle?.tasks);
  const showOriginal = useUiStore((state) => state.showOriginalDates);
  const place = useWorkspaceStore((state) => state.placeProject);

  if (!project) {
    return null;
  }

  const related = tasksForProject(taskList ?? [], project.id);
  const progress = progressPercent(related);
  const done = related.filter((task) => task.status === "done").length;
  const overdue = isOverdue(project, todayIso());
  const minWidth = monthWidthContaining(project.startDate);

  return (
    <article
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card py-2.5 pr-3 pl-4 ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      style={{ height: CARD_HEIGHT }}
      aria-label={project.title}
    >
      <span className="absolute inset-y-3 left-0 w-1 rounded-full" style={{ background: project.color }} />
      <Handle type="target" position={Position.Left} className="life-handle" />
      <Handle type="source" position={Position.Right} className="life-handle" />
      <NodeResizeControl
        position="right"
        resizeDirection="horizontal"
        minWidth={minWidth}
        minHeight={CARD_HEIGHT}
        maxHeight={CARD_HEIGHT}
        onResizeEnd={(_, params) => {
          const bundle = useWorkspaceStore.getState().bundle;
          if (!bundle) {
            return;
          }
          place(project.id, {
            startDate: project.startDate,
            targetDate: targetDateFromWidth(project.startDate, params.width),
            lane: laneOf(bundle, project.id),
          });
        }}
      />
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full"
          style={{ background: project.color, color: inkOn(project.color) }}
        >
          <ProjectIcon icon={project.icon} className="size-3.5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold tracking-tight">{project.title}</h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {formatShortDate(project.startDate)} — {formatShortDate(project.targetDate)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: project.color }} />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {done}/{related.length || 0}
        </span>
        <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[project.status]}</span>
        {overdue ? <span className="text-[10px] font-medium text-[var(--today)]">Vencido</span> : null}
      </div>
      {showOriginal && project.originalTargetDate && project.originalTargetDate !== project.targetDate ? (
        <p className="absolute right-3 bottom-2 text-[10px] text-muted-foreground line-through opacity-0 group-hover:opacity-100">
          {formatShortDate(project.originalTargetDate)}
        </p>
      ) : null}
    </article>
  );
}
