import { describe, expect, it } from "vitest";

import { lifestyleMonthly, monthsCovered, summarizeMoney } from "@/lib/domain/money";
import type { Project } from "@/lib/domain/types";

function plan(partial: Pick<Project, "id" | "title" | "startDate" | "targetDate" | "budget" | "moneyFlow" | "status" | "category">): Project {
  return {
    workspaceId: "w",
    description: "",
    color: "#4285F4",
    icon: "Wallet",
    completedOn: null,
    originalTargetDate: null,
    priority: "medium",
    ownerId: null,
    notes: "",
    kind: "project",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "u",
    ...partial,
  };
}

describe("money", () => {
  it("spreads a budget across the months a project covers", () => {
    expect(monthsCovered("2026-01-01", "2027-06-30")).toHaveLength(18);
    const summary = summarizeMoney([
      plan({
        id: "save",
        title: "Enganche",
        category: "dinero",
        moneyFlow: "save",
        status: "in_progress",
        startDate: "2026-01-01",
        targetDate: "2027-06-30",
        budget: 180000,
      }),
      plan({
        id: "trip",
        title: "Viaje",
        category: "viaje",
        moneyFlow: "spend",
        status: "planned",
        startDate: "2027-03-01",
        targetDate: "2027-04-30",
        budget: 90000,
      }),
      plan({
        id: "skip",
        title: "Cancelado",
        category: "personal",
        moneyFlow: "spend",
        status: "cancelled",
        startDate: "2026-01-01",
        targetDate: "2026-01-31",
        budget: 5000,
      }),
    ]);

    expect(summary.save).toBe(180000);
    expect(summary.spend).toBe(90000);
    expect(summary.balance).toBe(90000);
    const year2026 = summary.years.find((year) => year.year === 2026);
    const year2027 = summary.years.find((year) => year.year === 2027);
    expect(year2026?.save).toBe(120000);
    expect(year2026?.spend).toBe(0);
    expect(year2026?.perMonth).toBe(0);
    expect(year2027?.save).toBe(60000);
    expect(year2027?.spend).toBe(90000);
    expect(year2027?.perMonth).toBe(7500);
    expect(year2027?.months[2]?.spend).toBe(45000);
    expect(year2027?.months[0]?.save).toBe(10000);
  });

  it("suma el estilo de vida al mes y deja las actividades dentro del gasto", () => {
    expect(
      lifestyleMonthly([
        { id: "a", workspaceId: "w", name: "Renta", monthlyAmount: 12000, createdAt: "", updatedAt: "" },
        { id: "b", workspaceId: "w", name: "Comida", monthlyAmount: 8000, createdAt: "", updatedAt: "" },
      ]),
    ).toBe(20000);

    const summary = summarizeMoney([
      plan({
        id: "dinner",
        title: "Cena",
        category: "evento",
        moneyFlow: "spend",
        status: "planned",
        startDate: "2026-06-01",
        targetDate: "2026-06-01",
        budget: 1800,
      }),
    ]);
    expect(summary.spend).toBe(1800);
  });
});
