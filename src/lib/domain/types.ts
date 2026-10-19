export const PROJECT_STATUSES = [
  "idea",
  "planned",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
] as const;

export const PRIORITIES = ["low", "medium", "high"] as const;

export const CATEGORIES = [
  "hogar",
  "dinero",
  "viaje",
  "crecimiento",
  "negocio",
  "evento",
  "personal",
] as const;

export const RELATIONS = ["enables", "depends_on", "related"] as const;

export const TASK_STATUSES = ["open", "done"] as const;

export const MONEY_FLOWS = ["spend", "save"] as const;

export const ITEM_KINDS = ["project", "activity"] as const;

export const ICON_IDS = [
  "House",
  "PiggyBank",
  "Plane",
  "Languages",
  "Briefcase",
  "Sun",
  "Car",
  "KeyRound",
  "Heart",
  "Sprout",
  "Wallet",
  "Compass",
] as const;

export const PROJECT_COLORS = [
  { id: "blue", value: "#4285F4" },
  { id: "red", value: "#EA4335" },
  { id: "yellow", value: "#FBBC04" },
  { id: "green", value: "#34A853" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Category = (typeof CATEGORIES)[number];
export type RelationKind = (typeof RELATIONS)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type MoneyFlow = (typeof MONEY_FLOWS)[number];
export type ItemKind = (typeof ITEM_KINDS)[number];
export type IconId = (typeof ICON_IDS)[number];

export type Workspace = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Member = {
  userId: string;
  workspaceId: string;
  role: "owner" | "editor";
  displayName: string;
  email: string;
  avatarHue: number;
};

export type Project = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  category: Category;
  color: string;
  icon: IconId;
  startDate: string;
  targetDate: string;
  completedOn: string | null;
  originalTargetDate: string | null;
  status: ProjectStatus;
  priority: Priority;
  ownerId: string | null;
  notes: string;
  budget: number | null;
  moneyFlow: MoneyFlow;
  kind: ItemKind;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  targetDate: string | null;
  assigneeId: string | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectConnection = {
  id: string;
  workspaceId: string;
  sourceId: string;
  targetId: string;
  relation: RelationKind;
  createdAt: string;
};

export type CanvasLayout = {
  projectId: string;
  lane: number;
  updatedAt: string;
};

export type HistoryKind = "created" | "dates_changed" | "status_changed" | "task" | "restored";

export type HistoryEntry = {
  id: string;
  projectId: string;
  actorId: string | null;
  kind: HistoryKind;
  summary: string;
  payload: Record<string, string | number | null>;
  createdAt: string;
};

export type LifestyleCost = {
  id: string;
  workspaceId: string;
  name: string;
  monthlyAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type Invitation = {
  id: string;
  workspaceId: string;
  email: string;
  token: string;
  invitedBy: string;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt: string;
};

export type Bundle = {
  workspace: Workspace;
  members: Member[];
  projects: Project[];
  tasks: Task[];
  connections: ProjectConnection[];
  layouts: CanvasLayout[];
  history: HistoryEntry[];
  invitations: Invitation[];
  lifestyle: LifestyleCost[];
  viewerId: string;
};
