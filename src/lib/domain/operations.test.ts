import { describe, expect, it } from "vitest";

import { changeProjectDates, deleteTask, reorderTasks, toggleTask } from "@/lib/domain/operations";
import { isOverdue, progressPercent, tasksForProject } from "@/lib/domain/progress";
import { createSeedBundle } from "@/lib/domain/seed";

const HOUSE = "00000000-0000-4000-8000-000000000012";
const PASSPORT = "00000000-0000-4000-8000-000000000018";

describe("projects", () => {
  it("calculates progress from tasks and keeps it when dates move", () => {
    const seed = createSeedBundle();
    const beforeTasks = tasksForProject(seed.tasks, HOUSE);
    expect(progressPercent(beforeTasks)).toBe(50);

    const moved = changeProjectDates(
      seed,
      HOUSE,
      { startDate: "2027-07-01", targetDate: "2028-05-31" },
      "2026-10-18T12:00:00.000Z",
      "00000000-0000-4000-8000-000000000999",
    );
    const project = moved.projects.find((item) => item.id === HOUSE);
    expect(project?.targetDate).toBe("2028-05-31");
    expect(project?.originalTargetDate).toBe("2027-12-31");
    expect(project?.notes).toBe(seed.projects.find((item) => item.id === HOUSE)?.notes);
    expect(project?.ownerId).toBe(seed.projects.find((item) => item.id === HOUSE)?.ownerId);
    expect(tasksForProject(moved.tasks, HOUSE)).toEqual(beforeTasks);
    expect(progressPercent(tasksForProject(moved.tasks, HOUSE))).toBe(50);
    expect(moved.history[0]?.kind).toBe("dates_changed");
  });

  it("does not complete an overdue project by itself", () => {
    const seed = createSeedBundle();
    const passport = seed.projects.find((item) => item.id === PASSPORT);
    expect(passport?.status).toBe("in_progress");
    expect(passport && isOverdue(passport, "2026-10-18")).toBe(true);
  });

  it("keeps completed tasks when one is reopened or the list is reordered", () => {
    const seed = createSeedBundle();
    const done = tasksForProject(seed.tasks, HOUSE).find((task) => task.status === "done");
    expect(done).toBeTruthy();
    const reopened = toggleTask(seed, done!.id, "2026-10-18T12:00:00.000Z", "00000000-0000-4000-8000-000000000998");
    expect(tasksForProject(reopened.tasks, HOUSE)).toHaveLength(6);
    expect(tasksForProject(reopened.tasks, HOUSE).filter((task) => task.status === "done")).toHaveLength(2);

    const ids = tasksForProject(seed.tasks, HOUSE).map((task) => task.id).reverse();
    const ordered = reorderTasks(seed, HOUSE, ids, "2026-10-18T12:00:00.000Z");
    expect(tasksForProject(ordered.tasks, HOUSE).map((task) => task.id)).toEqual(ids);
    expect(ordered.tasks.filter((task) => task.status === "done")).toHaveLength(
      seed.tasks.filter((task) => task.status === "done").length,
    );

    const removed = deleteTask(seed, ids[0]!);
    expect(removed.tasks.some((task) => task.id === ids[0])).toBe(false);
    expect(removed.tasks.filter((task) => task.projectId === HOUSE && task.status === "done").length).toBeGreaterThan(0);
  });
});
