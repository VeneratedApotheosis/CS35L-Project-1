import { describe, expect, it } from "vitest";
import { PLANT_TYPES } from "../domain/plants.js";
import { createHabitBody } from "./habits.js";

const valid = {
  name: "Gym",
  plant_type: "flower",
  target_count: 3,
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
};

const without = (key: string) =>
  Object.fromEntries(Object.entries(valid).filter(([name]) => name !== key));

const rejects = (body: unknown) =>
  expect(createHabitBody.safeParse(body).success).toBe(false);

describe("createHabitBody", () => {
  it("accepts a valid body", () => {
    const result = createHabitBody.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject(valid);
  });

  it("turns a null description into undefined", () => {
    const result = createHabitBody.safeParse({ ...valid, description: null });
    expect(result.success).toBe(true);
    expect(result.data?.description).toBeUndefined();
  });

  it("accepts a start_date", () => {
    const result = createHabitBody.safeParse({
      ...valid,
      start_date: "2026-11-05",
    });
    expect(result.success).toBe(true);
    expect(result.data?.start_date).toBe("2026-11-05");
  });

  it("rejects a missing name", () => rejects(without("name")));

  it("rejects a whitespace-only name", () =>
    rejects({ ...valid, name: "   " }));

  it("rejects a 101-character name", () =>
    rejects({ ...valid, name: "a".repeat(101) }));

  it("rejects a 501-character description", () =>
    rejects({ ...valid, description: "a".repeat(501) }));

  it("rejects target_count 0 and 51", () => {
    rejects({ ...valid, target_count: 0 });
    rejects({ ...valid, target_count: 51 });
  });

  it("rejects interval_count 0 and 366", () => {
    rejects({ ...valid, interval_count: 0 });
    rejects({ ...valid, interval_count: 366 });
  });

  it("rejects interval_unit year", () =>
    rejects({ ...valid, interval_unit: "year" }));

  it("rejects a missing num_periods", () => rejects(without("num_periods")));

  it("rejects num_periods 0 and 53", () => {
    rejects({ ...valid, num_periods: 0 });
    rejects({ ...valid, num_periods: 53 });
  });

  it("rejects plant_type cactus", () =>
    rejects({ ...valid, plant_type: "cactus" }));

  it("rejects an extra key such as owner_id", () =>
    rejects({ ...valid, owner_id: "11111111-1111-1111-1111-111111111111" }));

  it("rejects a start_date that is not a real date", () =>
    rejects({ ...valid, start_date: "2026-02-30" }));

  it("rejects a start_date that is not a date string", () =>
    rejects({ ...valid, start_date: "tomorrow" }));
});

describe("PLANT_TYPES", () => {
  // [PLACEHOLDER] The list is pending a team decision. Update this test when
  // it changes.
  it("lists the five provisional types", () => {
    expect(PLANT_TYPES).toEqual(["flower", "tree", "shrub", "vine", "kelp"]);
  });
});
