import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { fakeSupabase, GOOD_TOKEN, TEST_USER } from "../test/fakeSupabase.js";

vi.mock("../lib/supabase.js", async () => {
  const { fakeSupabase } = await import("../test/fakeSupabase.js");
  return { createUserClient: () => fakeSupabase.client };
});

const auth = `Bearer ${GOOD_TOKEN}`;

const profile = {
  id: TEST_USER.id,
  display_name: "Sam",
  avatar_url: null,
  timezone: "America/Los_Angeles",
};

// The tests run on Mon 30 Nov 2026 in Los Angeles (UTC is already the 1st).
const habit = (id: string, name: string, extra: object = {}) => ({
  id,
  name,
  plant_type: "pothos",
  target_count: 1,
  interval_count: 1,
  interval_unit: "week",
  num_periods: 10,
  start_date: "2026-11-02",
  ...extra,
});

const log = (id: string, habit_id: string, occurred_on: string) => ({
  id,
  habit_id,
  occurred_on,
});

const get = () => request(app).get("/dashboard").set("Authorization", auth);

beforeEach(() => {
  fakeSupabase.reset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-01T03:00:00Z"));
  fakeSupabase.setResult("profiles", "select", { data: profile, error: null });
  fakeSupabase.setResult("habits", "select", { data: [], error: null });
  fakeSupabase.setResult("activity_logs", "select", { data: [], error: null });
});

afterEach(() => vi.useRealTimers());

describe("GET /dashboard", () => {
  it("returns zeros and nulls for a user with no habits", async () => {
    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      active_count: 0,
      overall_consistency: null,
      best_streak: null,
      habits: [],
      needs_attention: [],
      finished: [],
    });
    // No habits means there is nothing to read logs for.
    expect(fakeSupabase.callsFor("activity_logs", "select")).toHaveLength(0);
  });

  it("calculates the overall view from the habits and logs", async () => {
    const read = habit("a", "Read");
    const run = habit("b", "Run");
    const gym = habit("g", "Gym", {
      num_periods: 4,
      target_count: 3,
      start_date: "2026-11-02",
    });
    fakeSupabase.setResult("habits", "select", {
      data: [read, run, gym],
      error: null,
    });
    fakeSupabase.setResult("activity_logs", "select", {
      data: [
        // Read: weeks 1 to 4 met and week 5 met so far, a streak of 5.
        log("1", "a", "2026-11-02"),
        log("2", "a", "2026-11-09"),
        log("3", "a", "2026-11-16"),
        log("4", "a", "2026-11-23"),
        log("5", "a", "2026-11-30"),
        // Run: only week 4 met, so the plant is wilted.
        log("6", "b", "2026-11-23"),
        // Gym ended on 30 Nov with 3 of 12 logs: a failed habit.
        log("7", "g", "2026-11-03"),
        log("8", "g", "2026-11-04"),
        log("9", "g", "2026-11-05"),
      ],
      error: null,
    });

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body.active_count).toBe(2);
    expect(res.body.best_streak).toEqual({ id: "a", name: "Read", streak: 5 });
    expect(res.body.habits.map((h: { name: string }) => h.name)).toEqual([
      "Read",
      "Run",
    ]);
    // Read is 4 of 4 (100%) and Run is 1 of 4 (25%), averaging 62.5%.
    expect(res.body.overall_consistency).toBeCloseTo(0.625);
    expect(res.body.needs_attention).toHaveLength(1);
    expect(res.body.needs_attention[0]).toMatchObject({
      id: "b",
      name: "Run",
      health: "wilted",
    });
    expect(res.body.finished).toEqual([
      {
        id: "g",
        name: "Gym",
        plant_type: "pothos",
        end_date: "2026-11-30",
        progress: 0.25,
        consistency: 0.25,
        badge: "none",
      },
    ]);
  });

  it("uses the profile timezone for today", async () => {
    // 30 Nov in Los Angeles, but already 1 Dec in UTC. A habit that started on
    // 30 Nov has not finished a week either way. One that started on 1 Dec has
    // not started in Los Angeles.
    fakeSupabase.setResult("habits", "select", {
      data: [habit("a", "Read", { start_date: "2026-12-01" })],
      error: null,
    });

    const inLosAngeles = await get();
    expect(inLosAngeles.body.habits[0].state).toBe("not_started");

    fakeSupabase.setResult("profiles", "select", {
      data: { ...profile, timezone: null },
      error: null,
    });
    const inUtc = await get();
    expect(inUtc.body.habits[0].state).toBe("active");
  });

  it("filters the habits by owner and reads all logs in one query", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: [habit("a", "Read"), habit("b", "Run")],
      error: null,
    });

    await get();

    const habitReads = fakeSupabase.callsFor("habits", "select");
    expect(habitReads).toHaveLength(1);
    expect(habitReads[0]?.filter).toEqual({
      column: "owner_id",
      value: TEST_USER.id,
    });
    const logReads = fakeSupabase.callsFor("activity_logs", "select");
    expect(logReads).toHaveLength(1);
    expect(logReads[0]?.inFilter).toEqual({
      column: "habit_id",
      values: ["a", "b"],
    });
  });

  it("returns 500 when the habits cannot be read", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: null,
      error: { message: "boom" },
    });

    const res = await get();

    expect(res.status).toBe(500);
    expect(res.body.error).toEqual({
      code: "internal_error",
      message: "Could not load the dashboard",
    });
  });

  it("returns 500 when the logs cannot be read", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: [habit("a", "Read")],
      error: null,
    });
    fakeSupabase.setResult("activity_logs", "select", {
      data: null,
      error: { message: "boom" },
    });

    const res = await get();

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Could not load logs");
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/dashboard");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
    expect(fakeSupabase.callsFor("habits", "select")).toHaveLength(0);
  });
});
