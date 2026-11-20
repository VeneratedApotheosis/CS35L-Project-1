import { describe, expect, it } from "vitest";
import { editSharedHabitBody } from "./sharedHabits.js";

describe("shared habit edit validation", () => {
  it("accepts editable fields and an explicit null description", () => {
    expect(
      editSharedHabitBody.parse({
        name: "  Walk  ",
        description: null,
        max_members: 2,
      }),
    ).toEqual({ name: "Walk", description: null, max_members: 2 });
  });
  it.each([
    {},
    { owner_id: "forged" },
    { join_code: "forged" },
    { name: "  " },
    { description: "x".repeat(501) },
    { plant_type: "unknown" },
    { target_count: 0 },
    { interval_count: 366 },
    { interval_unit: "year" },
    { num_periods: null },
    { start_date: "2026-02-30" },
    { join_by: "tomorrow" },
    { max_members: 1 },
    { max_members: 51 },
  ])("rejects invalid patches %j", (patch) => {
    expect(editSharedHabitBody.safeParse(patch).success).toBe(false);
  });
});
