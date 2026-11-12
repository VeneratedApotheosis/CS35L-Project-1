import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { fakeSupabase, GOOD_TOKEN, TEST_USER } from "../test/fakeSupabase.js";

vi.mock("../lib/supabase.js", async () => {
  const { fakeSupabase } = await import("../test/fakeSupabase.js");
  return { createUserClient: () => fakeSupabase.client };
});

const auth = `Bearer ${GOOD_TOKEN}`;

// zod only accepts real uuids, so the variant digit must be 8, 9, a or b.
const habitId = "7d3f9c1e-5b2a-4c8e-9f41-2a6b8d0e1c33";
const logId = "5a1c2e3f-4b5d-4e6f-8a7b-9c0d1e2f3a4b";

const profile = {
  id: TEST_USER.id,
  display_name: "Sam",
  avatar_url: null,
  timezone: "America/Los_Angeles",
};

// 3 times a week for 4 weeks. The tests run on 4 Nov 2026 in Los Angeles.
const baseHabit = {
  id: habitId,
  owner_id: TEST_USER.id,
  name: "Gym",
  plant_type: "pothos",
  target_count: 3,
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
  start_date: "2026-11-02", // a Monday: period 1 is 2 to 8 Nov
};

const row = (occurred_on: string, id = logId) => ({
  id,
  habit_id: habitId,
  occurred_on,
});

const setHabit = (habit: unknown) =>
  fakeSupabase.setResult("habits", "select", { data: habit, error: null });

beforeEach(() => {
  fakeSupabase.reset();
  // It is 2026-11-04 in Los Angeles and 2026-11-05 in UTC. Only Date is
  // faked, because supertest needs real timers for network IO.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-05T03:00:00Z"));
  fakeSupabase.setResult("profiles", "select", { data: profile, error: null });
  setHabit(baseHabit);
});

afterEach(() => vi.useRealTimers());

describe("POST /habits/:id/logs", () => {
  const post = (payload?: object, id = habitId) => {
    const req = request(app)
      .post(`/habits/${id}/logs`)
      .set("Authorization", auth);
    return payload === undefined ? req : req.send(payload);
  };

  beforeEach(() => {
    fakeSupabase.setResult("activity_logs", "insert", {
      data: row("2026-11-04"),
      error: null,
    });
    // The logs after the insert: the new one is the only one.
    fakeSupabase.setResult("activity_logs", "select", {
      data: [row("2026-11-04")],
      error: null,
    });
  });

  it("logs today in the user's timezone when there is no body", async () => {
    const res = await post();

    expect(res.status).toBe(201);
    expect(res.body.log).toEqual(row("2026-11-04"));
    const inserts = fakeSupabase.callsFor("activity_logs", "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.payload).toEqual({
      habit_id: habitId,
      occurred_on: "2026-11-04",
    });
  });

  it("returns the habit's updated stats with the log", async () => {
    const res = await post({});

    expect(res.status).toBe(201);
    expect(res.body.stats).toMatchObject({
      state: "active",
      current_period: { number: 1, count: 1, target: 3 },
      stage: 1,
      health: "healthy",
    });
    expect(res.body.stats.overall_progress).toBeCloseTo(1 / 12);
  });

  it("logs an earlier day in the current period", async () => {
    const res = await post({ occurred_on: "2026-11-03" });

    expect(res.status).toBe(201);
    expect(
      fakeSupabase.callsFor("activity_logs", "insert")[0]?.payload,
    ).toEqual({ habit_id: habitId, occurred_on: "2026-11-03" });
  });

  it("only touches the user's own habit", async () => {
    await post();

    const habitReads = fakeSupabase.callsFor("habits", "select");
    expect(habitReads[0]?.filter).toEqual({ column: "id", value: habitId });
    expect(habitReads[0]?.moreFilters).toEqual([
      { column: "owner_id", value: TEST_USER.id },
    ]);
  });

  it("rejects a future date", async () => {
    const res = await post({ occurred_on: "2026-11-05" });

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: "validation_failed",
      message: "occurred_on: cannot be in the future",
    });
    expect(fakeSupabase.callsFor("activity_logs", "insert")).toHaveLength(0);
  });

  it("rejects a date in an earlier, locked period", async () => {
    // Started 19 Oct: period 3 is 2 to 8 Nov, so 1 Nov is in period 2.
    setHabit({ ...baseHabit, start_date: "2026-10-19" });

    const res = await post({ occurred_on: "2026-11-01" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("must be in the current period");
    expect(fakeSupabase.callsFor("activity_logs", "insert")).toHaveLength(0);
  });

  it("rejects a log on an expired habit", async () => {
    setHabit({ ...baseHabit, start_date: "2026-09-01" });

    const res = await post();

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(
      "This habit has ended and takes no new logs",
    );
    expect(fakeSupabase.callsFor("activity_logs", "insert")).toHaveLength(0);
  });

  it("allows logging today on a habit that has not started", async () => {
    setHabit({ ...baseHabit, start_date: "2026-11-10" });

    const res = await post();

    expect(res.status).toBe(201);
    expect(res.body.stats.state).toBe("not_started");
    // The log counts toward the first period.
    expect(res.body.stats.current_period).toMatchObject({
      number: 1,
      count: 1,
    });
  });

  it("rejects a past day on a habit that has not started", async () => {
    setHabit({ ...baseHabit, start_date: "2026-11-10" });

    const res = await post({ occurred_on: "2026-11-03" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("can only be logged for today");
  });

  it("returns 404 for a habit that is not the user's", async () => {
    setHabit(null);

    const res = await post();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
    expect(fakeSupabase.callsFor("activity_logs", "insert")).toHaveLength(0);
  });

  it.each([
    ["a malformed date", { occurred_on: "11/04/2026" }],
    ["an impossible date", { occurred_on: "2026-02-30" }],
    ["an unknown field", { occurred_on: "2026-11-04", habit_id: habitId }],
    ["a forged id", { id: logId }],
  ])("rejects %s", async (_name, payload) => {
    const res = await post(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
    expect(fakeSupabase.callsFor("activity_logs", "insert")).toHaveLength(0);
  });

  it("rejects an id that is not a uuid", async () => {
    const res = await post(undefined, "not-a-uuid");

    expect(res.status).toBe(400);
    expect(fakeSupabase.callsFor("habits", "select")).toHaveLength(0);
  });

  it("returns 500 when the insert fails", async () => {
    fakeSupabase.setResult("activity_logs", "insert", {
      data: null,
      error: { message: "boom" },
    });

    const res = await post();

    expect(res.status).toBe(500);
    expect(res.body.error).toEqual({
      code: "internal_error",
      message: "Could not add log",
    });
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).post(`/habits/${habitId}/logs`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
    expect(fakeSupabase.callsFor("activity_logs", "insert")).toHaveLength(0);
  });
});

describe("DELETE /habits/:id/logs/:logId", () => {
  const del = (id = habitId, log = logId) =>
    request(app).delete(`/habits/${id}/logs/${log}`).set("Authorization", auth);

  // The first read finds the log. The second lists the logs left afterwards.
  const mockLog = (occurredOn: string, remaining: unknown[] = []) => {
    fakeSupabase.queueResult("activity_logs", "select", {
      data: row(occurredOn),
      error: null,
    });
    fakeSupabase.queueResult("activity_logs", "select", {
      data: remaining,
      error: null,
    });
    fakeSupabase.setResult("activity_logs", "delete", {
      data: null,
      error: null,
    });
  };

  it("deletes a log in the current period and returns the updated stats", async () => {
    mockLog("2026-11-04", [row("2026-11-03", "other-log")]);

    const res = await del();

    expect(res.status).toBe(200);
    expect(res.body.stats.current_period).toMatchObject({
      number: 1,
      count: 1,
    });
    const deletes = fakeSupabase.callsFor("activity_logs", "delete");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]?.filter).toEqual({ column: "id", value: logId });
    expect(deletes[0]?.moreFilters).toEqual([
      { column: "habit_id", value: habitId },
    ]);
  });

  it("looks the log up by id and habit", async () => {
    mockLog("2026-11-04");

    await del();

    const lookup = fakeSupabase.callsFor("activity_logs", "select")[0];
    expect(lookup?.filter).toEqual({ column: "id", value: logId });
    expect(lookup?.moreFilters).toEqual([
      { column: "habit_id", value: habitId },
    ]);
  });

  it("returns 404 when the log does not exist for this habit", async () => {
    fakeSupabase.queueResult("activity_logs", "select", {
      data: null,
      error: null,
    });

    const res = await del();

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: "not_found",
      message: "Log not found",
    });
    expect(fakeSupabase.callsFor("activity_logs", "delete")).toHaveLength(0);
  });

  it("returns 404 for a habit that is not the user's", async () => {
    setHabit(null);

    const res = await del();

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Habit not found");
    expect(fakeSupabase.callsFor("activity_logs", "delete")).toHaveLength(0);
  });

  it("refuses to delete a log in an earlier, locked period", async () => {
    // Started 19 Oct: 28 Oct is in period 2, and today is in period 3.
    setHabit({ ...baseHabit, start_date: "2026-10-19" });
    mockLog("2026-10-28");

    const res = await del();

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("current period");
    expect(fakeSupabase.callsFor("activity_logs", "delete")).toHaveLength(0);
  });

  it("refuses to delete a log on an expired habit", async () => {
    setHabit({ ...baseHabit, start_date: "2026-09-01" });
    mockLog("2026-09-25");

    const res = await del();

    expect(res.status).toBe(400);
    expect(fakeSupabase.callsFor("activity_logs", "delete")).toHaveLength(0);
  });

  it("deletes a log made before the habit started", async () => {
    setHabit({ ...baseHabit, start_date: "2026-11-10" });
    mockLog("2026-11-04");

    const res = await del();

    expect(res.status).toBe(200);
    expect(res.body.stats.state).toBe("not_started");
  });

  it("returns 500 when the lookup fails", async () => {
    fakeSupabase.queueResult("activity_logs", "select", {
      data: null,
      error: { message: "boom" },
    });

    const res = await del();

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Could not load log");
  });

  it("returns 500 when the delete fails", async () => {
    mockLog("2026-11-04");
    fakeSupabase.setResult("activity_logs", "delete", {
      data: null,
      error: { message: "boom" },
    });

    const res = await del();

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Could not delete log");
  });

  it.each([
    ["habit id", "not-a-uuid", logId],
    ["log id", habitId, "not-a-uuid"],
  ])("rejects a %s that is not a uuid", async (_name, id, log) => {
    const res = await del(id, log);

    expect(res.status).toBe(400);
    expect(fakeSupabase.callsFor("habits", "select")).toHaveLength(0);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).delete(`/habits/${habitId}/logs/${logId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
    expect(fakeSupabase.callsFor("activity_logs", "delete")).toHaveLength(0);
  });
});
