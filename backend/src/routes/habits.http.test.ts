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

const createdHabit = { id: "22222222-2222-2222-2222-222222222222", ...body };

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
