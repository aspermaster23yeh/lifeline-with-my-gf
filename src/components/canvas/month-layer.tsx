"use client";

import { ViewportPortal, useStore, useViewport } from "@xyflow/react";

import { dateToX, monthsInRange, todayIso } from "@/lib/domain/timeline";

export function MonthLayer() {
  const { x, y, zoom } = useViewport();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const left = -x / zoom - 400;
  const right = (-x + width) / zoom + 400;
  const top = -y / zoom - 200;
  const bandHeight = height / Math.max(zoom, 0.2) + 400;
  const months = monthsInRange(left, right);
  const todayX = dateToX(todayIso());

  return (
    <ViewportPortal>
      {months.map((month) => (
        <div
          key={month.startDate}
          style={{
            position: "absolute",
            left: month.x,
            width: month.width,
            top,
            height: bandHeight,
            borderLeft: "1px solid var(--map-line)",
            background: month.month % 2 === 0 ? "color-mix(in oklab, var(--foreground) 2.5%, transparent)" : "transparent",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: todayX,
          top,
          height: bandHeight,
          width: 2,
          background: "var(--today)",
        }}
      />
    </ViewportPortal>
  );
}
