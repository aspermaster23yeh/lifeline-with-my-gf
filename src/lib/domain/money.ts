import { parseDay } from "@/lib/domain/timeline";
import type { MoneyFlow, Project } from "@/lib/domain/types";

export type MonthKey = { year: number; month: number };

export type YearMoney = {
  year: number;
  save: number;
  spend: number;
  perMonth: number;
  months: { month: number; save: number; spend: number }[];
};

export type MoneySummary = {
  save: number;
  spend: number;
  balance: number;
  years: YearMoney[];
};

export function moneyFlowOf(project: Pick<Project, "moneyFlow" | "category">): MoneyFlow {
  if (project.moneyFlow === "save" || project.moneyFlow === "spend") {
    return project.moneyFlow;
  }
  return project.category === "dinero" ? "save" : "spend";
}

export function monthsCovered(startDate: string, targetDate: string): MonthKey[] {
  const start = parseDay(startDate);
  const end = parseDay(targetDate);
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const months: MonthKey[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= last) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function roundPeso(value: number): number {
  return Math.round(value);
}

export function summarizeMoney(projects: Project[]): MoneySummary {
  const byYear = new Map<number, YearMoney>();
  let save = 0;
  let spend = 0;

  for (const project of projects) {
    if (project.status === "cancelled" || project.budget === null || project.budget <= 0) {
      continue;
    }
    const months = monthsCovered(project.startDate, project.targetDate);
    if (months.length === 0) {
      continue;
    }
    const share = project.budget / months.length;
    const flow = moneyFlowOf(project);
    if (flow === "save") {
      save += project.budget;
    } else {
      spend += project.budget;
    }
    for (const month of months) {
      const year = byYear.get(month.year) ?? emptyYear(month.year);
      year[flow] += share;
      const slot = year.months[month.month];
      if (slot) {
        slot[flow] += share;
      }
      byYear.set(month.year, year);
    }
  }

  const years = [...byYear.values()]
    .sort((left, right) => left.year - right.year)
    .map((year) => ({
      ...year,
      save: roundPeso(year.save),
      spend: roundPeso(year.spend),
      perMonth: roundPeso(year.spend / 12),
      months: year.months.map((month) => ({
        month: month.month,
        save: roundPeso(month.save),
        spend: roundPeso(month.spend),
      })),
    }));

  return { save, spend, balance: save - spend, years };
}

function emptyYear(year: number): YearMoney {
  return {
    year,
    save: 0,
    spend: 0,
    perMonth: 0,
    months: Array.from({ length: 12 }, (_, month) => ({ month, save: 0, spend: 0 })),
  };
}
