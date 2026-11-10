import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { fakeSupabase, GOOD_TOKEN, TEST_USER } from "../test/fakeSupabase.js";

vi.mock("../lib/supabase.js", async () => {
  const { fakeSupabase } = await import("../test/fakeSupabase.js");
  return { createUserClient: () => fakeSupabase.client };
});

const auth = `Bearer ${GOOD_TOKEN}`;

const body = {
  name: "Gym",
  plant_type: "pothos",
  target_count: 3,
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
};

const profile = {
  id: TEST_USER.id,
  display_name: "Sam",
  avatar_url: null,
  timezone: "America/Los_Angeles",
};

const createdHabit = {
  id: "22222222-2222-2222-2222-222222222222",
  ...body,
  start_date: "2026-11-04",
};

// The stats of a habit that started today (4 Nov in Los Angeles) with no logs.
const freshStats = {
  state: "active",
  current_period: {
    number: 1,
    total: 4,
    start: "2026-11-04",
    end: "2026-11-11",
    count: 0,
    target: 3,
  },
  overall_progress: 0,
  stage: 1,
  health: "healthy",
};

// zod only accepts real uuids, so the variant digit must be 8, 9, a or b.
const habitId = "7d3f9c1e-5b2a-4c8e-9f41-2a6b8d0e1c33";

const post = (payload: unknown) =>
  request(app)
    .post("/habits")
    .set("Authorization", auth)
    .send(payload as object);

beforeEach(() => {
  fakeSupabase.reset();
  // It is 2026-11-04 in Los Angeles and 2026-11-05 in UTC. Only Date is
  // faked, because supertest needs real timers for network IO.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-05T03:00:00Z"));
  fakeSupabase.setResult("profiles", "select", { data: profile, error: null });
  fakeSupabase.setResult("habits", "insert", {
    data: createdHabit,
    error: null,
  });
  fakeSupabase.setResult("activity_logs", "select", { data: [], error: null });
});

afterEach(() => vi.useRealTimers());

describe("POST /habits", () => {
  it("creates a habit owned by the user, starting today in their timezone", async () => {
    const res = await post(body);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(createdHabit);
    const inserts = fakeSupabase.callsFor("habits", "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.payload).toMatchObject({
      ...body,
      owner_id: TEST_USER.id,
      start_date: "2026-11-04",
    });
    expect(inserts[0]?.payload).not.toHaveProperty("timezone");
    expect(inserts[0]?.payload).not.toHaveProperty("seed");
  });

  it("accepts a start_date equal to today", async () => {
    const res = await post({ ...body, start_date: "2026-11-04" });

    expect(res.status).toBe(201);
    expect(fakeSupabase.callsFor("habits", "insert")[0]?.payload).toMatchObject(
      {
        start_date: "2026-11-04",
      },
    );
  });

  it("rejects a start_date before today", async () => {
    const res = await post({ ...body, start_date: "2026-11-03" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
    expect(res.body.error.message).toBe("start_date: must be today or later");
    expect(fakeSupabase.callsFor("habits", "insert")).toHaveLength(0);
  });

  it("rejects a forged owner_id", async () => {
    const res = await post({
      ...body,
      owner_id: "99999999-9999-9999-9999-999999999999",
    });

    expect(res.status).toBe(400);
    expect(fakeSupabase.callsFor("habits", "insert")).toHaveLength(0);
  });

  it("returns 500 when the insert fails", async () => {
    fakeSupabase.setResult("habits", "insert", {
      data: null,
      error: { message: "boom" },
    });

    const res = await post(body);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "internal_error", message: "Could not create habit" },
    });
  });
});

describe("GET /habits", () => {
  const get = (path = "/habits") =>
    request(app).get(path).set("Authorization", auth);

  const rows = [
    { ...createdHabit, owner_id: TEST_USER.id },
    {
      ...createdHabit,
      id: "33333333-3333-3333-3333-333333333333",
      owner_id: TEST_USER.id,
    },
  ];

  it("returns an empty page when the user has no habits", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: [],
      error: null,
      count: 0,
    });

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ habits: [], total: 0, limit: 50, offset: 0 });
  });

  it("returns the rows and the total", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: rows,
      error: null,
      count: 7,
    });

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      habits: rows.map((row) => ({ ...row, stats: freshStats })),
      total: 7,
      limit: 50,
      offset: 0,
    });
  });

  it("adds the stats from the logs, reading all logs in one query", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: rows,
      error: null,
      count: 2,
    });
    // Two logs on the first habit, none on the second.
    fakeSupabase.setResult("activity_logs", "select", {
      data: [
        { id: "a1", habit_id: rows[0]?.id, occurred_on: "2026-11-04" },
        { id: "a2", habit_id: rows[0]?.id, occurred_on: "2026-11-04" },
      ],
      error: null,
    });

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body.habits[0].stats.current_period.count).toBe(2);
    expect(res.body.habits[0].stats.overall_progress).toBeCloseTo(2 / 12);
    expect(res.body.habits[1].stats.current_period.count).toBe(0);
    const logReads = fakeSupabase.callsFor("activity_logs", "select");
    expect(logReads).toHaveLength(1);
    expect(logReads[0]?.inFilter).toEqual({
      column: "habit_id",
      values: rows.map((row) => row.id),
    });
  });

  it("uses the profile timezone for today", async () => {
    // 5 Nov is tomorrow in Los Angeles, but today in UTC.
    const startsOnFifth = [{ ...rows[0], start_date: "2026-11-05" }];
    fakeSupabase.setResult("habits", "select", {
      data: startsOnFifth,
      error: null,
      count: 1,
    });

    const inLosAngeles = await get();
    expect(inLosAngeles.body.habits[0].stats.state).toBe("not_started");

    fakeSupabase.setResult("profiles", "select", {
      data: { ...profile, timezone: null },
      error: null,
    });
    const inUtc = await get();
    expect(inUtc.body.habits[0].stats.state).toBe("active");
  });

  it("skips the profile and log reads for an empty page", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: [],
      error: null,
      count: 0,
    });

    await get();

    expect(fakeSupabase.callsFor("profiles", "select")).toHaveLength(0);
    expect(fakeSupabase.callsFor("activity_logs", "select")).toHaveLength(0);
  });

  it("returns 500 when the logs cannot be read", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: rows,
      error: null,
      count: 2,
    });
    fakeSupabase.setResult("activity_logs", "select", {
      data: null,
      error: { message: "boom" },
    });

    const res = await get();

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Could not load logs");
  });

  it("filters by owner, sorts newest first and asks for the first 50", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: rows,
      error: null,
      count: 2,
    });

    await get();

    const selects = fakeSupabase.callsFor("habits", "select");
    expect(selects).toHaveLength(1);
    expect(selects[0]?.count).toBe("exact");
    expect(selects[0]?.filter).toEqual({
      column: "owner_id",
      value: TEST_USER.id,
    });
    expect(selects[0]?.moreFilters).toBeUndefined();
    expect(selects[0]?.orders).toEqual([
      { column: "created_at", ascending: false },
      { column: "id", ascending: false },
    ]);
    expect(selects[0]?.range).toEqual({ from: 0, to: 49 });
  });

  it("turns limit and offset from the query string into a range", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: [],
      error: null,
      count: 0,
    });

    const res = await get("/habits?limit=10&offset=20");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ limit: 10, offset: 20 });
    expect(fakeSupabase.callsFor("habits", "select")[0]?.range).toEqual({
      from: 20,
      to: 29,
    });
  });

  it.each(["limit=0", "limit=101", "limit=abc", "offset=-1", "limt=10"])(
    "rejects the query %s",
    async (query) => {
      const res = await get(`/habits?${query}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("validation_failed");
      expect(fakeSupabase.callsFor("habits", "select")).toHaveLength(0);
    },
  );

  it("returns 500 when the query fails", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: null,
      error: { message: "boom" },
    });

    const res = await get();

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "internal_error", message: "Could not list habits" },
    });
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/habits");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
    expect(fakeSupabase.callsFor("habits", "select")).toHaveLength(0);
  });
});

describe("GET /habits/:id", () => {
  const get = (id: string) =>
    request(app).get(`/habits/${id}`).set("Authorization", auth);

  const habit = { ...createdHabit, id: habitId, owner_id: TEST_USER.id };

  it("returns the habit and filters by id and owner", async () => {
    fakeSupabase.setResult("habits", "select", { data: habit, error: null });

    const res = await get(habitId);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(habit);
    const selects = fakeSupabase.callsFor("habits", "select");
    expect(selects).toHaveLength(1);
    expect(selects[0]?.filter).toEqual({ column: "id", value: habitId });
    expect(selects[0]?.moreFilters).toEqual([
      { column: "owner_id", value: TEST_USER.id },
    ]);
  });

  it("returns 404 when there is no such habit for this user", async () => {
    fakeSupabase.setResult("habits", "select", { data: null, error: null });

    const res = await get(habitId);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "not_found", message: "Habit not found" },
    });
  });

  it("returns 400 for an id that is not a uuid", async () => {
    const res = await get("not-a-uuid");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
    expect(fakeSupabase.callsFor("habits", "select")).toHaveLength(0);
  });

  it("returns 500 when the query fails", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: null,
      error: { message: "boom" },
    });

    const res = await get(habitId);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "internal_error", message: "Could not load habit" },
    });
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get(`/habits/${habitId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });
});
