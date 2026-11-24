import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { awardNewBadges } from "../services/achievements.js";
import { fakeSupabase, GOOD_TOKEN, TEST_USER } from "../test/fakeSupabase.js";

vi.mock("../lib/supabase.js", async () => {
  const { fakeSupabase } = await import("../test/fakeSupabase.js");
  return { createUserClient: () => fakeSupabase.client };
});

const auth = `Bearer ${GOOD_TOKEN}`;
const NOW = "2026-11-24T20:00:00.000Z";

const profile = {
  id: TEST_USER.id,
  display_name: "Sam",
  avatar_url: null,
  timezone: "America/Los_Angeles",
};

// 3 times a week for 4 weeks from Monday 2 Nov 2026.
const habitId = "7d3f9c1e-5b2a-4c8e-9f41-2a6b8d0e1c33";
const gym = {
  id: habitId,
  plant_type: "pothos",
  target_count: 3,
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
  start_date: "2026-11-02",
  created_at: "2026-11-02T18:00:00Z",
};
const log = (occurred_on: string) => ({
  habit_id: habitId,
  occurred_on,
  created_at: `${occurred_on}T18:00:00Z`,
});

type Earned = { badge_id: string; earned_at: string; seen_at: string | null };
const earned = (badge_id: string, seen_at: string | null = NOW): Earned => ({
  badge_id,
  earned_at: "2026-11-02T18:00:00Z",
  seen_at,
});

// Programs the fake with one user's data. `added` is what award_badges
// returns: the rows it actually inserted.
function given(options: {
  habits?: unknown[];
  logs?: unknown[];
  stored?: Earned[];
  added?: Earned[];
}) {
  fakeSupabase.setResult("profiles", "select", { data: profile, error: null });
  fakeSupabase.setResult("habits", "select", {
    data: options.habits ?? [],
    error: null,
  });
  fakeSupabase.setResult("activity_logs", "select", {
    data: options.logs ?? [],
    error: null,
  });
  fakeSupabase.setResult("user_badges", "select", {
    data: options.stored ?? [],
    error: null,
  });
  fakeSupabase.setResult("award_badges", "select", {
    data: options.added ?? [],
    error: null,
  });
}

beforeEach(() => {
  fakeSupabase.reset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => vi.useRealTimers());

describe("GET /me/badges", () => {
  it("returns the book for a new user with nothing earned", async () => {
    given({});

    const res = await request(app).get("/me/badges").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.earned_count).toBe(0);
    expect(res.body.unseen).toEqual([]);
    expect(res.body.chapters[0].id).toBe("getting-started");
    expect(res.body.chapters[0].badges[0]).toEqual({
      id: "seed-money",
      name: "Seed Money",
      description: "Create your first habit.",
      tier: "bronze",
      secret: false,
      state: "locked",
      progress: { count: 0, target: 1 },
      earned_at: null,
    });
    // Nothing new, so nothing is stored.
    expect(fakeSupabase.callsFor("award_badges", "select")).toHaveLength(0);
  });

  it("leaves out the secret chapter until a secret badge is earned", async () => {
    given({});

    const res = await request(app).get("/me/badges").set("Authorization", auth);

    const ids = res.body.chapters.map((chapter: { id: string }) => chapter.id);
    expect(ids).not.toContain("secret");
    expect(res.body.visible_count).toBe(76);
  });

  it("stores newly earned badges and reports them as unseen", async () => {
    given({
      habits: [gym],
      logs: [log("2026-11-23")],
      added: [earned("seed-money", null), earned("first-drop", null)],
    });

    const res = await request(app).get("/me/badges").set("Authorization", auth);

    expect(res.status).toBe(200);
    const awarded = fakeSupabase.callsFor("award_badges", "select");
    expect(awarded).toHaveLength(1);
    expect(awarded[0]?.payload).toEqual({
      p_badge_ids: expect.arrayContaining(["seed-money", "first-drop"]),
    });
    expect(res.body.unseen).toEqual(["seed-money", "first-drop"]);
    const seed = res.body.chapters[0].badges[0];
    expect(seed.state).toBe("earned");
    expect(seed.progress).toEqual({ count: 1, target: 1 });
  });

  it("shows progress, capped at the target, for badges in progress", async () => {
    given({
      habits: [gym],
      logs: [log("2026-11-23"), log("2026-11-23"), log("2026-11-24")],
      stored: [earned("seed-money"), earned("first-drop")],
    });

    const res = await request(app).get("/me/badges").set("Authorization", auth);

    const logging = res.body.chapters.find(
      (chapter: { id: string }) => chapter.id === "logging",
    );
    expect(logging.badges[0]).toMatchObject({
      id: "ten-taps",
      state: "in_progress",
      progress: { count: 3, target: 10 },
    });
  });

  it("keeps a stored badge earned even when its rule no longer holds", async () => {
    // The habit behind Ten Taps was deleted.
    given({ stored: [earned("ten-taps")] });

    const res = await request(app).get("/me/badges").set("Authorization", auth);

    const logging = res.body.chapters.find(
      (chapter: { id: string }) => chapter.id === "logging",
    );
    expect(logging.badges[0]).toMatchObject({
      id: "ten-taps",
      state: "earned",
      earned_at: "2026-11-02T18:00:00Z",
    });
    expect(res.body.earned_count).toBe(1);
  });

  it("shows unbuilt badges as locked with no progress", async () => {
    given({});

    const res = await request(app).get("/me/badges").set("Authorization", auth);

    const streaks = res.body.chapters.find(
      (chapter: { id: string }) => chapter.id === "streaks",
    );
    const unbroken = streaks.badges.find(
      (badge: { id: string }) => badge.id === "unbroken",
    );
    expect(unbroken).toMatchObject({ state: "locked", progress: null });
  });

  it("reads only personal habits and logs with their save time", async () => {
    given({ habits: [gym] });

    await request(app).get("/me/badges").set("Authorization", auth);

    expect(fakeSupabase.callsFor("habits", "select")[0]?.filter).toEqual({
      column: "owner_id",
      value: TEST_USER.id,
    });
    expect(fakeSupabase.callsFor("activity_logs", "select")[0]?.columns).toBe(
      "habit_id, occurred_on, created_at",
    );
    expect(fakeSupabase.calls.map((call) => call.table)).not.toContain(
      "shared_habit_logs",
    );
  });

  it("returns 500 when the badges cannot be loaded", async () => {
    given({});
    fakeSupabase.setResult("user_badges", "select", {
      data: null,
      error: { message: "boom" },
    });

    const res = await request(app).get("/me/badges").set("Authorization", auth);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal_error");
  });

  it("needs a token", async () => {
    const res = await request(app).get("/me/badges");
    expect(res.status).toBe(401);
  });
});

describe("GET /me/badges/unseen", () => {
  it("returns only earned badges that have not been shown", async () => {
    given({
      habits: [gym],
      stored: [earned("seed-money"), earned("green-thumb", null)],
    });

    const res = await request(app)
      .get("/me/badges/unseen")
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.badges).toHaveLength(1);
    expect(res.body.badges[0]).toMatchObject({
      id: "green-thumb",
      state: "earned",
    });
  });

  it("does not report a badge another request stored at the same time", async () => {
    // The rule says Seed Money is new, but award_badges inserted nothing.
    given({ habits: [gym], added: [] });

    const res = await request(app)
      .get("/me/badges/unseen")
      .set("Authorization", auth);

    expect(res.body.badges).toEqual([]);
  });
});

describe("POST /me/badges/seen", () => {
  it("marks only unseen badges of the user as seen", async () => {
    fakeSupabase.setResult("user_badges", "update", {
      data: null,
      error: null,
    });

    const res = await request(app)
      .post("/me/badges/seen")
      .set("Authorization", auth)
      .send({ ids: ["seed-money", "first-drop"] });

    expect(res.status).toBe(204);
    const [update] = fakeSupabase.callsFor("user_badges", "update");
    expect(update?.payload).toEqual({ seen_at: NOW });
    expect(update?.filter).toEqual({ column: "user_id", value: TEST_USER.id });
    expect(update?.inFilter).toEqual({
      column: "badge_id",
      values: ["seed-money", "first-drop"],
    });
    expect(update?.isFilter).toEqual({ column: "seen_at", value: null });
  });

  it("rejects ids that are not badge ids", async () => {
    const res = await request(app)
      .post("/me/badges/seen")
      .set("Authorization", auth)
      .send({ ids: ["Not An Id"] });

    expect(res.status).toBe(400);
    expect(fakeSupabase.calls).toEqual([]);
  });

  it("rejects an empty list", async () => {
    const res = await request(app)
      .post("/me/badges/seen")
      .set("Authorization", auth)
      .send({ ids: [] });

    expect(res.status).toBe(400);
  });
});

describe("awardNewBadges", () => {
  it("returns the badges this check stored", async () => {
    given({ habits: [gym], added: [earned("seed-money", null)] });

    const badges = await awardNewBadges(fakeSupabase.client, TEST_USER.id);

    expect(badges.map((badge) => badge.id)).toEqual(["seed-money"]);
  });

  it("awards Personal Touch when the request sets the name", async () => {
    given({ added: [earned("personal-touch", null)] });

    await awardNewBadges(fakeSupabase.client, TEST_USER.id, {
      displayNameSet: true,
    });

    expect(fakeSupabase.callsFor("award_badges", "select")[0]?.payload).toEqual(
      { p_badge_ids: ["personal-touch"] },
    );
  });

  it("returns no badges instead of failing when the check fails", async () => {
    given({});
    fakeSupabase.setResult("habits", "select", {
      data: null,
      error: { message: "boom" },
    });

    await expect(
      awardNewBadges(fakeSupabase.client, TEST_USER.id),
    ).resolves.toEqual([]);
  });
});
