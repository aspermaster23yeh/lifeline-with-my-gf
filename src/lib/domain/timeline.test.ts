import { describe, expect, it } from "vitest";

import {
  dateToX,
  monthWidthContaining,
  monthsInRange,
  shiftByMonths,
  spanForRange,
  targetDateFromWidth,
  xToDate,
  monthDeltaFromDrag,
} from "@/lib/domain/timeline";

describe("timeline", () => {
  it("round-trips calendar dates through coordinates", () => {
    expect(xToDate(dateToX("2020-01-01"))).toBe("2020-01-01");
    expect(xToDate(dateToX("2027-05-18"))).toBe("2027-05-18");
    expect(dateToX("2020-01-01")).toBe(0);
  });

  it("gives each month its real number of days", () => {
    expect(monthWidthContaining("2026-01-15")).toBe(31 * 10);
    expect(monthWidthContaining("2026-02-01")).toBe(28 * 10);
    expect(monthWidthContaining("2028-02-10")).toBe(29 * 10);
  });

  it("snaps a resized card to the end of the month it reaches", () => {
    const january = spanForRange("2027-01-01", "2027-01-31");
    expect(targetDateFromWidth("2027-01-01", january.width)).toBe("2027-01-31");
    const throughMay = spanForRange("2027-01-01", "2027-05-31");
    expect(targetDateFromWidth("2027-01-01", throughMay.width)).toBe("2027-05-31");
  });

  it("moves a whole project by calendar months", () => {
    const dragged = dateToX("2027-02-03");
    expect(monthDeltaFromDrag("2027-01-15", dragged)).toBe(1);
    expect(shiftByMonths("2027-01-15", "2027-03-31", 1)).toEqual({
      startDate: "2027-02-15",
      targetDate: "2027-04-30",
    });
  });

  it("builds contiguous month columns", () => {
    const months = monthsInRange(dateToX("2027-01-01"), dateToX("2027-03-15"));
    expect(months.map((month) => month.label)).toEqual(["Enero", "Febrero", "Marzo"]);
    expect(months[0]!.x + months[0]!.width).toBe(months[1]!.x);
  });
});
