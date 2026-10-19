import type { Category, MoneyFlow, Priority, ProjectStatus, RelationKind } from "@/lib/domain/types";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  planned: "Planeado",
  in_progress: "En progreso",
  paused: "Pausado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  hogar: "Hogar",
  dinero: "Dinero",
  viaje: "Viaje",
  crecimiento: "Crecimiento",
  negocio: "Negocio",
  evento: "Evento",
  personal: "Personal",
};

export const ITEM_KIND_LABEL = {
  project: "Proyecto",
  activity: "Actividad",
} as const;

export const MONEY_FLOW_LABEL: Record<MoneyFlow, string> = {
  save: "Ahorro",
  spend: "Gasto",
};

export const RELATION_LABEL: Record<RelationKind, string> = {
  enables: "Habilita",
  depends_on: "Depende de",
  related: "Relacionado",
};

export const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const MONTH_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;
