"use client";

import { MONTH_SHORT } from "@/lib/domain/labels";
import { dateToX, monthsInRange, todayIso } from "@/lib/domain/timeline";

type Viewport = { x: number; y: number; zoom: number };

export function MonthRuler({ viewport, width }: { viewport: Viewport; width: number }) {
  const left = -viewport.x / viewport.zoom - 80;
  const right = (-viewport.x + width) / viewport.zoom + 80;
  const months = monthsInRange(left, right);
  const todayX = dateToX(todayIso());

  return (
    <div className="relative h-12 shrink-0 overflow-hidden border-b border-border/80 bg-background/85 backdrop-blur-md">
      {months.map((month) => {
        const screenX = viewport.x + month.x * viewport.zoom;
        const screenWidth = month.width * viewport.zoom;
        return (
          <div
            key={month.startDate}
            className="absolute top-0 flex h-full flex-col justify-center border-l border-[var(--map-line)] px-2"
            style={{ left: screenX, width: screenWidth }}
          >
            {month.month === 0 ? (
              <span className="font-display text-[11px] leading-none text-foreground/80">{month.year}</span>
            ) : null}
            {screenWidth > 36 ? (
              <span className="truncate text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {screenWidth < 64 ? MONTH_SHORT[month.month] : month.label}
              </span>
            ) : null}
          </div>
        );
      })}
      <div
        className="absolute top-0 h-full w-px bg-[var(--today)]"
        style={{ left: viewport.x + todayX * viewport.zoom }}
      >
        <span className="absolute top-1 left-1 text-[10px] font-medium text-[var(--today)]">Hoy</span>
      </div>
    </div>
  );
}
