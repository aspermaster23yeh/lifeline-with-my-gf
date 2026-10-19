import type { Project, Task } from "@/lib/domain/types";

export function progressPercent(tasks: Task[]): number {
  if (tasks.length === 0) {
    return 0;
  }
  const done = tasks.filter((task) => task.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

export function tasksForProject(tasks: Task[], projectId: string): Task[] {
  return tasks
    .filter((task) => task.projectId === projectId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export function isOverdue(project: Project, today: string): boolean {
  if (project.status === "completed" || project.status === "cancelled") {
    return false;
  }
  return project.targetDate < today;
}

export function isPending(project: Project): boolean {
  return project.status !== "completed" && project.status !== "cancelled";
}
