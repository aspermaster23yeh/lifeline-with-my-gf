import { addDays, addMonths, differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";

import { MONTH_LABELS } from "@/lib/domain/labels";

/** Pixels per calendar day at zoom 1. Dates, not pixels, are the source of truth. */
export const DAY_WIDTH = 10;
export const LANE_HEIGHT = 112;
export const LANE_PADDING = 18;
export const CARD_HEIGHT = 86;
export const EPOCH = new Date(2020, 0, 1);

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDay(iso: string): Date {
  const match = DAY_PATTERN.exec(iso);
  if (!match) {
    throw new Error(`Fecha inválida: ${iso}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Fecha inválida: ${iso}`);
  }
  return date;
}

export function formatDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(now = new Date()): string {
  return formatDay(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function dateToX(iso: string): number {
  return differenceInCalendarDays(parseDay(iso), EPOCH) * DAY_WIDTH;
}

export function xToDate(x: number): string {
  return formatDay(addDays(EPOCH, Math.round(x / DAY_WIDTH)));
}

export function spanForRange(startDate: string, targetDate: string): { x: number; width: number } {
  const start = parseDay(startDate);
  const target = parseDay(targetDate);
  const inclusiveEnd = target < start ? start : target;
  const exclusiveEnd = addDays(inclusiveEnd, 1);
  const x = dateToX(formatDay(start));
  const width = Math.max(DAY_WIDTH, differenceInCalendarDays(exclusiveEnd, start) * DAY_WIDTH);
  return { x, width };
}

export function monthWidthContaining(iso: string): number {
  const date = parseDay(iso);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return differenceInCalendarDays(next, start) * DAY_WIDTH;
}

export function shiftByMonths(
  startDate: string,
  targetDate: string,
  months: number,
): { startDate: string; targetDate: string } {
  if (months === 0) {
    return { startDate, targetDate };
  }
  return {
    startDate: formatDay(addMonths(parseDay(startDate), months)),
    targetDate: formatDay(addMonths(parseDay(targetDate), months)),
  };
}

export function monthDeltaFromDrag(originalStart: string, draggedX: number): number {
  const original = parseDay(originalStart);
  const dragged = parseDay(xToDate(draggedX));
  return (dragged.getFullYear() - original.getFullYear()) * 12 + (dragged.getMonth() - original.getMonth());
}

/** Maps a card width back to a target date snapped to the end of a calendar month. */
export function targetDateFromWidth(startDate: string, width: number): string {
  const start = parseDay(startDate);
  const exclusive = parseDay(xToDate(dateToX(startDate) + Math.max(width, DAY_WIDTH)));
  const inclusive = addDays(exclusive, -1);
  const lastOfMonth = new Date(inclusive.getFullYear(), inclusive.getMonth() + 1, 0);
  const minEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const snapped = lastOfMonth < minEnd ? minEnd : lastOfMonth;
  return formatDay(snapped);
}

export function laneFromY(y: number): number {
  return Math.max(0, Math.round((y - LANE_PADDING) / LANE_HEIGHT));
}

export function yFromLane(lane: number): number {
  return lane * LANE_HEIGHT + LANE_PADDING;
}

export type MonthColumn = {
  year: number;
  month: number;
  label: string;
  x: number;
  width: number;
  startDate: string;
};

export function monthsInRange(left: number, right: number): MonthColumn[] {
  const start = parseDay(xToDate(Math.min(left, right)));
  const end = parseDay(xToDate(Math.max(left, right)));
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const months: MonthColumn[] = [];

  while (cursor <= last) {
    const startDate = formatDay(cursor);
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const x = dateToX(startDate);
    months.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
      label: MONTH_LABELS[cursor.getMonth()] ?? "",
      x,
      width: dateToX(formatDay(next)) - x,
      startDate,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function formatLongDate(iso: string): string {
  return format(parseDay(iso), "MMMM 'de' yyyy", { locale: es });
}

export function formatShortDate(iso: string): string {
  return format(parseDay(iso), "d MMM yyyy", { locale: es });
}

export function yearOf(iso: string): number {
  return parseDay(iso).getFullYear();
}
