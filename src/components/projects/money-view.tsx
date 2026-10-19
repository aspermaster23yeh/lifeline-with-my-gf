"use client";

import { useState } from "react";

import { currency } from "@/components/people";
import { MONTH_SHORT } from "@/lib/domain/labels";
import { moneyFlowOf, summarizeMoney } from "@/lib/domain/money";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function MoneyView() {
  const bundle = useWorkspaceStore((state) => state.bundle);
  const selectProject = useUiStore((state) => state.selectProject);
  const [year, setYear] = useState(() => new Date().getFullYear());

  if (!bundle) {
    return null;
  }

  const summary = summarizeMoney(bundle.projects);
  const chosen = summary.years.find((item) => item.year === year);
  const years = summary.years.map((item) => item.year);
  const options = years.includes(year) ? years : [year, ...years].sort((a, b) => a - b);
  const peak = Math.max(1, ...(chosen?.months.map((month) => Math.max(month.save, month.spend)) ?? [1]));
  const planned = bundle.projects.filter((project) => project.status !== "cancelled" && project.budget);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Dinero</h2>
            <p className="text-sm text-muted-foreground">Lo que juntarían y lo que gastarían con los planes actuales.</p>
          </div>
          <select
            aria-label="Año"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {options.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">En total nos quedaría</p>
          <p className="font-display mt-1 text-4xl tracking-tight" style={{ color: summary.balance < 0 ? "#EA4335" : "#1A73E8" }}>
            {currency(summary.balance)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Amount label="Ahorraríamos" value={summary.save} tone="#34A853" />
            <Amount label="Gastaríamos" value={summary.spend} tone="#EA4335" />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Amount label={`Al año, ${year}`} value={chosen?.spend ?? 0} tone="#EA4335" boxed />
          <Amount label="Al mes, en promedio" value={chosen?.perMonth ?? 0} tone="#EA4335" boxed />
          <Amount label={`Ahorro en ${year}`} value={chosen?.save ?? 0} tone="#34A853" boxed />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Mes a mes</h3>
          <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
            {(chosen?.months ?? Array.from({ length: 12 }, (_, month) => ({ month, save: 0, spend: 0 }))).map((month) => (
              <div key={month.month} className="flex flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end justify-center gap-0.5">
                  <span className="w-1.5 rounded-full bg-[#34A853]" style={{ height: month.save === 0 ? 0 : `${Math.max(8, (month.save / peak) * 100)}%` }} />
                  <span className="w-1.5 rounded-full bg-[#EA4335]" style={{ height: month.spend === 0 ? 0 : `${Math.max(8, (month.spend / peak) * 100)}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{MONTH_SHORT[month.month]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Verde es ahorro. Rojo es gasto. Cada presupuesto se reparte entre los meses del proyecto.</p>
        </section>

        {planned.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Todavía no hay montos. Abre un proyecto y escribe cuánto quieren juntar o gastar.
          </p>
        ) : (
          <ul className="space-y-2">
            {planned.map((project) => {
              const flow = moneyFlowOf(project);
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => selectProject(project.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{project.title}</span>
                      <span className="text-xs text-muted-foreground">{flow === "save" ? "Ahorro" : "Gasto"}</span>
                    </span>
                    <span className="text-sm tabular-nums" style={{ color: flow === "save" ? "#34A853" : "#EA4335" }}>
                      {currency(project.budget)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Amount({ label, value, tone, boxed = false }: { label: string; value: number; tone: string; boxed?: boolean }) {
  return (
    <div className={boxed ? "rounded-2xl border border-border bg-card p-4" : ""}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums" style={{ color: tone }}>
        {currency(value)}
      </p>
    </div>
  );
}
