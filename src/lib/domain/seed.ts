import type { Bundle, HistoryEntry, Member, Project, Task } from "@/lib/domain/types";

export const VIEWER_ID = "00000000-0000-4000-8000-000000000001";
export const PARTNER_ID = "00000000-0000-4000-8000-000000000002";
export const WORKSPACE_ID = "00000000-0000-4000-8000-000000000010";

const SAVINGS_ID = "00000000-0000-4000-8000-000000000011";
const HOUSE_ID = "00000000-0000-4000-8000-000000000012";
const JAPANESE_ID = "00000000-0000-4000-8000-000000000013";
const TRIP_ID = "00000000-0000-4000-8000-000000000014";
const BUSINESS_ID = "00000000-0000-4000-8000-000000000015";
const CAR_ID = "00000000-0000-4000-8000-000000000016";
const BEACH_ID = "00000000-0000-4000-8000-000000000017";
const PASSPORT_ID = "00000000-0000-4000-8000-000000000018";

const SEEDED_AT = "2026-10-01T15:00:00.000Z";

function member(
  userId: string,
  displayName: string,
  email: string,
  role: Member["role"],
  avatarHue: number,
): Member {
  return { userId, workspaceId: WORKSPACE_ID, role, displayName, email, avatarHue };
}

function project(partial: Project): Project {
  return partial;
}

function task(
  id: string,
  projectId: string,
  title: string,
  sortOrder: number,
  done: boolean,
  assigneeId: string | null = VIEWER_ID,
): Task {
  return {
    id,
    projectId,
    title,
    description: "",
    status: done ? "done" : "open",
    targetDate: null,
    assigneeId,
    sortOrder,
    completedAt: done ? SEEDED_AT : null,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
}

function entry(
  id: string,
  projectId: string,
  summary: string,
  kind: HistoryEntry["kind"],
  payload: HistoryEntry["payload"] = {},
): HistoryEntry {
  return {
    id,
    projectId,
    actorId: VIEWER_ID,
    kind,
    summary,
    payload,
    createdAt: SEEDED_AT,
  };
}

export function emptyBundle(now = SEEDED_AT): Bundle {
  return {
    workspace: {
      id: WORKSPACE_ID,
      name: "Nuestro mapa",
      createdBy: VIEWER_ID,
      createdAt: now,
      updatedAt: now,
    },
    members: [
      member(VIEWER_ID, "Tú", "tu@local.test", "owner", 28),
      member(PARTNER_ID, "Pareja", "pareja@local.test", "editor", 200),
    ],
    projects: [],
    tasks: [],
    connections: [],
    layouts: [],
    history: [],
    invitations: [],
    viewerId: VIEWER_ID,
  };
}

export function createSeedBundle(): Bundle {
  const base = emptyBundle();
  const projects = [
    project({
      id: SAVINGS_ID,
      workspaceId: WORKSPACE_ID,
      title: "Ahorrar el enganche",
      description: "Juntar el enganche sin dejar de vivir el año.",
      category: "dinero",
      color: "#6e8b74",
      icon: "PiggyBank",
      startDate: "2026-01-01",
      targetDate: "2027-06-30",
      completedOn: null,
      originalTargetDate: null,
      status: "in_progress",
      priority: "high",
      ownerId: VIEWER_ID,
      notes: "Apartamos una parte de cada quincena.",
      budget: 180000,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      createdBy: VIEWER_ID,
    }),
    project({
      id: HOUSE_ID,
      workspaceId: WORKSPACE_ID,
      title: "Comprar una casa",
      description: "Elegir un lugar con luz, cerca de un parque.",
      category: "hogar",
      color: "#c4622d",
      icon: "House",
      startDate: "2027-07-01",
      targetDate: "2027-12-31",
      completedOn: null,
      originalTargetDate: null,
      status: "planned",
      priority: "high",
      ownerId: PARTNER_ID,
      notes: "Queremos un lugar con luz, cerca de un parque.",
      budget: null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      createdBy: VIEWER_ID,
    }),
    project({
      id: JAPANESE_ID,
      workspaceId: WORKSPACE_ID,
      title: "Aprender japonés",
      description: "Llegar a poder pedir comida y movernos solos.",
      category: "crecimiento",
      color: "#3d7a8c",
      icon: "Languages",
      startDate: "2026-10-01",
      targetDate: "2027-02-28",
      completedOn: null,
      originalTargetDate: null,
      status: "in_progress",
      priority: "medium",
      ownerId: PARTNER_ID,
      notes: "",
      budget: null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      createdBy: PARTNER_ID,
    }),
    project({
      id: TRIP_ID,
      workspaceId: WORKSPACE_ID,
      title: "Viaje a Japón",
      description: "Dos semanas, sin prisa, en primavera.",
      category: "viaje",
      color: "#b7893a",
      icon: "Plane",
      startDate: "2027-03-01",
      targetDate: "2027-04-30",
      completedOn: null,
      originalTargetDate: "2027-03-31",
      status: "planned",
      priority: "medium",
      ownerId: VIEWER_ID,
      notes: "La fecha original era marzo. Lo extendimos para no correr.",
      budget: 90000,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      createdBy: VIEWER_ID,
    }),
    project({
      id: BUSINESS_ID,
      workspaceId: WORKSPACE_ID,
      title: "Crear un pequeño negocio",
      description: "Probar una idea propia los fines de semana.",
      category: "negocio",
      color: "#8a6278",
      icon: "Briefcase",
      startDate: "2026-11-01",
      targetDate: "2027-08-31",
      completedOn: null,
      originalTargetDate: null,
      status: "idea",
      priority: "low",
      ownerId: VIEWER_ID,
      notes: "",
      budget: null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      createdBy: VIEWER_ID,
    }),
    project({
      id: CAR_ID,
      workspaceId: WORKSPACE_ID,
      title: "Comprar un auto",
      description: "Solo si de verdad lo necesitamos.",
      category: "personal",
      color: "#3e4a59",
      icon: "Car",
      startDate: "2026-02-01",
      targetDate: "2026-05-31",
      completedOn: null,
      originalTargetDate: null,
      status: "paused",
      priority: "low",
      ownerId: PARTNER_ID,
      notes: "Lo pausamos para no competir con el enganche.",
      budget: null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      createdBy: PARTNER_ID,
    }),
    project({
      id: BEACH_ID,
      workspaceId: WORKSPACE_ID,
      title: "Fin de semana en la playa",
      description: "Un descanso corto, ya cumplido.",
      category: "evento",
      color: "#b85c6a",
      icon: "Sun",
      startDate: "2026-08-01",
      targetDate: "2026-08-31",
      completedOn: "2026-08-16",
      originalTargetDate: null,
      status: "completed",
      priority: "medium",
      ownerId: VIEWER_ID,
      notes: "Volveríamos al mismo pueblo.",
      budget: 6000,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      createdBy: VIEWER_ID,
    }),
    project({
      id: PASSPORT_ID,
      workspaceId: WORKSPACE_ID,
      title: "Renovar pasaportes",
      description: "Sigue pendiente. No se marca solo como terminado.",
      category: "viaje",
      color: "#7c8640",
      icon: "KeyRound",
      startDate: "2026-08-01",
      targetDate: "2026-09-30",
      completedOn: null,
      originalTargetDate: null,
      status: "in_progress",
      priority: "high",
      ownerId: PARTNER_ID,
      notes: "La cita se nos pasó. Hay que reprogramarlo si queremos.",
      budget: null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      createdBy: PARTNER_ID,
    }),
  ];

  const houseTasks = [
    "Definir presupuesto",
    "Investigar precios",
    "Crear plan de ahorro",
    "Comparar opciones",
    "Preparar documentación",
    "Seleccionar propiedad",
  ].map((title, index) =>
    task(
      `00000000-0000-4000-8000-00000000040${index}`,
      HOUSE_ID,
      title,
      index,
      index < 3,
      index % 2 === 0 ? VIEWER_ID : PARTNER_ID,
    ),
  );

  return {
    ...base,
    projects,
    tasks: [
      task("00000000-0000-4000-8000-000000000301", SAVINGS_ID, "Abrir la cuenta de enganche", 0, true),
      task("00000000-0000-4000-8000-000000000302", SAVINGS_ID, "Automatizar la transferencia", 1, true),
      task("00000000-0000-4000-8000-000000000303", SAVINGS_ID, "Revisar el avance cada mes", 2, false),
      ...houseTasks,
      task("00000000-0000-4000-8000-000000000311", JAPANESE_ID, "Terminar hiragana", 0, true, PARTNER_ID),
      task("00000000-0000-4000-8000-000000000312", JAPANESE_ID, "Practicar 15 minutos al día", 1, false, PARTNER_ID),
      task("00000000-0000-4000-8000-000000000321", TRIP_ID, "Elegir ciudades", 0, false),
      task("00000000-0000-4000-8000-000000000331", PASSPORT_ID, "Sacar la cita", 0, false, PARTNER_ID),
      task("00000000-0000-4000-8000-000000000332", PASSPORT_ID, "Reunir fotos y documentos", 1, true, PARTNER_ID),
      task("00000000-0000-4000-8000-000000000341", BEACH_ID, "Reservar", 0, true),
      task("00000000-0000-4000-8000-000000000342", BEACH_ID, "Empacar", 1, true),
    ],
    connections: [
      {
        id: "00000000-0000-4000-8000-000000000201",
        workspaceId: WORKSPACE_ID,
        sourceId: SAVINGS_ID,
        targetId: HOUSE_ID,
        relation: "enables",
        createdAt: SEEDED_AT,
      },
      {
        id: "00000000-0000-4000-8000-000000000202",
        workspaceId: WORKSPACE_ID,
        sourceId: JAPANESE_ID,
        targetId: TRIP_ID,
        relation: "enables",
        createdAt: SEEDED_AT,
      },
      {
        id: "00000000-0000-4000-8000-000000000203",
        workspaceId: WORKSPACE_ID,
        sourceId: BUSINESS_ID,
        targetId: TRIP_ID,
        relation: "related",
        createdAt: SEEDED_AT,
      },
    ],
    layouts: [
      { projectId: SAVINGS_ID, lane: 0, updatedAt: SEEDED_AT },
      { projectId: HOUSE_ID, lane: 0, updatedAt: SEEDED_AT },
      { projectId: JAPANESE_ID, lane: 1, updatedAt: SEEDED_AT },
      { projectId: TRIP_ID, lane: 1, updatedAt: SEEDED_AT },
      { projectId: BUSINESS_ID, lane: 2, updatedAt: SEEDED_AT },
      { projectId: CAR_ID, lane: 3, updatedAt: SEEDED_AT },
      { projectId: BEACH_ID, lane: 4, updatedAt: SEEDED_AT },
      { projectId: PASSPORT_ID, lane: 5, updatedAt: SEEDED_AT },
    ],
    history: [
      entry(TRIP_ID, TRIP_ID, "Fecha objetivo: marzo de 2027 → abril de 2027", "dates_changed", {
        previousTarget: "2027-03-31",
        nextTarget: "2027-04-30",
      }),
      entry(HOUSE_ID, HOUSE_ID, "Proyecto creado", "created"),
    ].map((item, index) => ({
      ...item,
      id: `00000000-0000-4000-8000-00000000030${index}`,
    })),
  };
}
