import { isOverdue, isPending } from "@/lib/domain/progress";
import type { Bundle, Category, Project } from "@/lib/domain/types";

export type StatusFilter = "all" | "pending" | "completed" | "overdue";

export type ProjectFilters = {
  query: string;
  category: Category | "all";
  status: StatusFilter;
  year: number | "all";
  ownerId: string | "all";
};

export function projectMatches(
  project: Project,
  tasksTitles: string,
  filters: ProjectFilters,
  today: string,
): boolean {
  if (filters.category !== "all" && project.category !== filters.category) {
    return false;
  }
  if (filters.ownerId !== "all" && project.ownerId !== filters.ownerId) {
    return false;
  }
  if (filters.year !== "all") {
    const startYear = Number(project.startDate.slice(0, 4));
    const targetYear = Number(project.targetDate.slice(0, 4));
    if (filters.year < startYear || filters.year > targetYear) {
      return false;
    }
  }
  if (filters.status === "pending" && !isPending(project)) {
    return false;
  }
  if (filters.status === "completed" && project.status !== "completed") {
    return false;
  }
  if (filters.status === "overdue" && !isOverdue(project, today)) {
    return false;
  }
  const query = filters.query.trim().toLowerCase();
  if (!query) {
    return true;
  }
  const haystack = [project.title, project.description, project.notes, tasksTitles]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function visibleProjects(bundle: Bundle, filters: ProjectFilters, today: string): Project[] {
  return bundle.projects.filter((project) => {
    const titles = bundle.tasks
      .filter((task) => task.projectId === project.id)
      .map((task) => task.title)
      .join(" ");
    return projectMatches(project, titles, filters, today);
  });
}

export function statusFilters(): { id: StatusFilter; label: string }[] {
  return [
    { id: "all", label: "Todos" },
    { id: "pending", label: "Pendientes" },
    { id: "completed", label: "Completados" },
    { id: "overdue", label: "Vencidos" },
  ];
}
