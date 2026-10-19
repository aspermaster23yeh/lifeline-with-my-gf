"use client";

import { useState } from "react";

import { currency } from "@/components/people";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ITEM_KIND_LABEL, MONTH_SHORT } from "@/lib/domain/labels";
import { lifestyleMonthly, moneyFlowOf, summarizeMoney } from "@/lib/domain/money";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

export function MoneyView() {
  const bundle = useWorkspaceStore((state) => state.bundle);
  const selectProject = useUiStore((state) => state.selectProject);
  const addLifestyleCost = useWorkspaceStore((state) => state.addLifestyleCost);
  const removeLifestyleCost = useWorkspaceStore((state) => state.removeLifestyleCost);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  if (!bundle) {
    return null;
  }

  const summary = summarizeMoney(bundle.projects);
  const lifeMonth = lifestyleMonthly(bundle.lifestyle ?? []);
  const lifeYear = lifeMonth * 12;
  const chosen = summary.years.find((item) => item.year === year);
  const years = summary.years.map((item) => item.year);
  const options = years.includes(year) ? years : [year, ...years].sort((a, b) => a - b);
  const peak = Math.max(1, lifeMonth, ...(chosen?.months.map((month) => Math.max(month.save, month.spend + lifeMonth)) ?? [1]));
  const planned = bundle.projects.filter((project) => project.status !== "cancelled" && project.budget);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Dinero</h2>
            <p className="text-sm text-muted-foreground">El costo de vivir así, más lo que cuestan los planes y las actividades.</p>
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
          <p className="text-sm text-muted-foreground">Estilo de vida</p>
          <p className="font-display mt-1 text-4xl tracking-tight text-[#1A73E8]">{currency(lifeMonth)}</p>
          <p className="mt-1 text-sm text-muted-foreground">al mes · {currency(lifeYear)} al año</p>
          <ul className="mt-4 space-y-2">
            {(bundle.lifestyle ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{item.name}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{currency(item.monthlyAmount)}</span>
                  <button type="button" className="text-xs text-muted-foreground" onClick={() => removeLifestyleCost(item.id)}>
                    Quitar
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const monthlyAmount = Math.round(Number(amount));
              if (!name.trim() || Number.isNaN(monthlyAmount)) {
                return;
              }
              addLifestyleCost({ name, monthlyAmount });
              setName("");
              setAmount("");
            }}
          >
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Renta, comida, salidas" aria-label="Gasto mensual" className="min-w-40 flex-1" />
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={0} placeholder="Al mes" aria-label="Monto mensual" className="w-28" />
            <Button type="submit" size="sm">Agregar</Button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Vivir así en {year}</p>
          <p className="font-display mt-1 text-4xl tracking-tight">{currency(lifeYear + (chosen?.spend ?? 0))}</p>
          <p className="mt-1 text-sm text-muted-foreground">Estilo de vida del año más los gastos de proyectos y actividades.</p>
        </section>

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
                  <span className="w-1.5 rounded-full bg-[#EA4335]" style={{ height: month.spend + lifeMonth === 0 ? 0 : `${Math.max(8, ((month.spend + lifeMonth) / peak) * 100)}%` }} />
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
                      <span className="text-xs text-muted-foreground">
                        {ITEM_KIND_LABEL[project.kind === "activity" ? "activity" : "project"]} · {flow === "save" ? "Ahorro" : "Gasto"}
                      </span>
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
