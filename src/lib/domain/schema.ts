import { z } from "zod";

import {
  CATEGORIES,
  ICON_IDS,
  PRIORITIES,
  PROJECT_STATUSES,
  ITEM_KINDS,
  MONEY_FLOWS,
  RELATIONS,
} from "@/lib/domain/types";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa una fecha válida.");

export const projectInputSchema = z
  .object({
    title: z.string().trim().min(1, "El proyecto necesita un nombre.").max(80),
    description: z.string().trim().max(500),
    category: z.enum(CATEGORIES),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    icon: z.enum(ICON_IDS),
    startDate: day,
    targetDate: day,
    status: z.enum(PROJECT_STATUSES),
    priority: z.enum(PRIORITIES),
    ownerId: z.string().uuid().nullable(),
    budget: z.number().int().nonnegative().nullable(),
    moneyFlow: z.enum(MONEY_FLOWS),
    kind: z.enum(ITEM_KINDS),
    notes: z.string().max(4000),
  })
  .refine((value) => value.targetDate >= value.startDate, {
    path: ["targetDate"],
    message: "La fecha objetivo no puede ser anterior al inicio.",
  });

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "La tarea necesita un nombre.").max(140),
  description: z.string().trim().max(500),
  targetDate: day.nullable(),
  assigneeId: z.string().uuid().nullable(),
});

export const invitationSchema = z.object({
  email: z.string().trim().email("Escribe un correo válido.").max(180),
});

export const lifestyleInputSchema = z.object({
  name: z.string().trim().min(1, "El gasto necesita un nombre.").max(80),
  monthlyAmount: z.number().int().nonnegative(),
});

export const relationSchema = z.enum(RELATIONS);

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type LifestyleInput = z.infer<typeof lifestyleInputSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos.";
}
