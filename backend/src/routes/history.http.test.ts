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

// Weekly for 4 weeks from Oct 5, so it ended on Nov 2.
const habit = (id: string, extra: object = {}) => ({
  id,
  name: id,
  description: null,
  plant_type: "pothos",
  target_count: 1,
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
  start_date: "2026-10-05",
  ...extra,
});

const log = (id: string, habit_id: string, occurred_on: string) => ({
  id,
  habit_id,
  occurred_on,
});

const get = (query = "") =>
  request(app).get(`/me/history${query}`).set("Authorization", auth);

beforeEach(() => {
  fakeSupabase.reset();
  vi.useFakeTimers({ toFake: ["Date"] });
  // Mon 30 Nov 2026 in Los Angeles.
  vi.setSystemTime(new Date("2026-12-01T03:00:00Z"));
  fakeSupabase.setResult("profiles", "select", { data: profile, error: null });
  fakeSupabase.setResult("habits", "select", { data: [], error: null });
  fakeSupabase.setResult("activity_logs", "select", { data: [], error: null });
});

afterEach(() => vi.useRealTimers());

describe("GET /me/history", () => {
  it("needs a token", async () => {
    const res = await request(app).get("/me/history");
    expect(res.status).toBe(401);
  });

  it("returns an empty page and summary for a new user", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      summary: {
        finished: 0,
        by_level: { gold: 0, silver: 0, bronze: 0, none: 0 },
        total_logs: 0,
        average_final_progress: null,
        next_end_date: null,
      },
      habits: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
  });

  it("lists finished habits with their final numbers, own habits only", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: [habit("a"), habit("b", { start_date: "2026-11-23" })],
      error: null,
    });
    fakeSupabase.setResult("activity_logs", "select", {
      data: ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"].map(
        (date, i) => log(`l${i}`, "a", date),
      ),
      error: null,
    });

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.summary).toMatchObject({
      finished: 1,
      next_end_date: "2026-12-21",
    });
    expect(res.body.habits).toEqual([
      expect.objectContaining({
        id: "a",
        badge: "gold",
        last_day: "2026-11-01",
        total_logs: 4,
        best_streak: 4,
      }),
    ]);
    const [query] = fakeSupabase.callsFor("habits", "select");
    expect(query?.filter).toEqual({ column: "owner_id", value: TEST_USER.id });
  });

  it("filters by level and pages after filtering", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: [habit("x"), habit("y"), habit("z")],
      error: null,
    });

    const res = await get("?level=none&limit=1&offset=1");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.habits.map((h: { id: string }) => h.id)).toEqual(["y"]);
    expect(res.body.summary.finished).toBe(3);
  });

  it("rejects an unknown level or sort", async () => {
    expect((await get("?level=platinum")).status).toBe(400);
    expect((await get("?sort=random")).status).toBe(400);
  });

  it("returns a 500 when the habits cannot be read", async () => {
    fakeSupabase.setResult("habits", "select", {
      data: null,
      error: { message: "boom" },
    });
    const res = await get();
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Could not load your history");
  });
});
