import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import {
  fakeSupabase as db,
  GOOD_TOKEN,
  TEST_USER,
} from "../test/fakeSupabase.js";

vi.mock("../lib/supabase.js", async () => {
  const { fakeSupabase } = await import("../test/fakeSupabase.js");
  return { createUserClient: () => fakeSupabase.client };
});
const id = "7d3f9c1e-5b2a-4c8e-9f41-2a6b8d0e1c33";
const other = "22222222-2222-4222-8222-222222222222";
const auth = `Bearer ${GOOD_TOKEN}`;
const input = {
  name: "Walk together",
  plant_type: "pothos",
  target_count: 1,
  interval_count: 1,
  interval_unit: "day",
  num_periods: 4,
  start_date: "2026-11-18",
  join_by: "2026-11-17",
  max_members: 5,
};
const habit = {
  ...input,
  id,
  owner_id: TEST_USER.id,
  description: null,
  join_code: "secret-code",
  created_at: "2026-11-17",
};
const members = [
  {
    user_id: TEST_USER.id,
    display_name: "Me",
    avatar_url: null,
    timezone: "America/Los_Angeles",
    is_owner: true,
    joined_at: "2026-11-17",
  },
  {
    user_id: other,
    display_name: "Friend",
    avatar_url: null,
    timezone: "Asia/Tokyo",
    is_owner: false,
    joined_at: "2026-11-17",
  },
];
const get = () =>
  request(app).get(`/shared-habits/${id}`).set("Authorization", auth);
const post = (body: object) =>
  request(app).post("/shared-habits").set("Authorization", auth).send(body);
beforeEach(() => {
  db.reset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T02:00:00Z")); // Still Nov 17 in LA.
  db.setResult("profiles", "select", {
    data: { id: TEST_USER.id, timezone: "America/Los_Angeles" },
    error: null,
  });
  db.setResult("shared_habits", "insert", { data: habit, error: null });
  db.setResult("shared_habits", "select", { data: habit, error: null });
  db.setResult("shared_habit_members_info", "select", {
    data: members,
    error: null,
  });
  db.setResult("shared_habit_member_logs", "select", {
    data: [{ user_id: other, occurred_on: "2026-11-18", count: 2 }],
    error: null,
  });
  db.setResult("shared_habit_logs", "select", { data: [], error: null });
});
afterEach(() => vi.useRealTimers());

describe("shared habit endpoints", () => {
  it("creates with verified ownership and relies on the membership trigger", async () => {
    const res = await post(input);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(habit);
    expect(db.callsFor("shared_habits", "insert")[0]?.payload).toMatchObject({
      ...input,
      owner_id: TEST_USER.id,
    });
    expect(db.callsFor("shared_habit_members", "insert")).toHaveLength(0);
  });
  it.each([
    { max_members: 1 },
    { max_members: 51 },
    { max_members: 2.5 },
    { join_by: "2026-11-19" },
    { join_by: "2026-11-16" },
    { start_date: "2026-11-16" },
    { join_by: "2026-02-30" },
    { owner_id: other },
    { join_code: "forged" },
    { num_periods: null },
  ])("rejects invalid creation input %j", async (patch) => {
    expect((await post({ ...input, ...patch })).status).toBe(400);
    expect(db.callsFor("shared_habits", "insert")).toHaveLength(0);
  });
  it("defaults start to local today and accepts both member-cap limits", async () => {
    const body = { ...input, start_date: undefined };
    for (const max_members of [2, 50]) {
      expect((await post({ ...body, max_members })).status).toBe(201);
    }
    expect(db.callsFor("shared_habits", "insert")[0]?.payload).toMatchObject({
      start_date: "2026-11-17",
    });
  });
  it("returns group stats, safe member summaries, and only the caller's own history", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({
      today: "2026-11-17",
      overall_progress: 0.25,
      stage: 2,
    });
    expect(res.body.members[1]).toMatchObject({
      display_name: "Friend",
      overall_progress: 0.5,
      current_period_count: 2,
    });
    expect(res.body.members[1]).not.toHaveProperty("log_days");
    expect(res.body.members[1]).not.toHaveProperty("current_period_logs");
    expect(res.body.members[1]).not.toHaveProperty("occurred_on");
    expect(res.body.own_stats.log_days).toEqual([]);
    expect(
      db.callsFor("shared_habit_logs", "select")[0]?.moreFilters,
    ).toContainEqual({ column: "user_id", value: TEST_USER.id });
    expect(
      db.callsFor("shared_habit_member_logs", "select")[0]?.payload,
    ).toEqual({ p_shared_habit_id: id });
  });
  it("returns 404 for missing habits and non-members", async () => {
    db.setResult("shared_habits", "select", { data: null, error: null });
    expect((await get()).status).toBe(404);
    db.setResult("shared_habits", "select", { data: habit, error: null });
    db.setResult("shared_habit_members_info", "select", {
      data: [],
      error: null,
    });
    expect((await get()).status).toBe(404);
    expect(db.callsFor("shared_habit_logs", "select")).toHaveLength(0);
    expect(db.callsFor("shared_habit_member_logs", "select")).toHaveLength(0);
  });
  it("lists membership-visible habits with pagination and group stats", async () => {
    db.setResult("shared_habits", "select", {
      data: [habit],
      error: null,
      count: 7,
    });
    const res = await request(app)
      .get("/shared-habits?limit=2&offset=2")
      .set("Authorization", auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 7, limit: 2, offset: 2 });
    expect(res.body.habits[0].stats.overall_progress).toBe(0.25);
    expect(res.body.habits[0]).toMatchObject({
      member_count: 2,
      own_today: "2026-11-17",
      own_stats: { overall_progress: 0, current_period: { count: 0 } },
    });
    expect(res.body.habits[0]).not.toHaveProperty("members");
    expect(res.body.habits[0].own_stats).not.toHaveProperty("log_days");
    expect(db.callsFor("shared_habits", "select")[0]?.orders).toEqual([
      { column: "created_at", ascending: true },
      { column: "id", ascending: true },
    ]);
    expect(db.callsFor("shared_habits", "select")[0]?.range).toEqual({
      from: 2,
      to: 3,
    });
  });
  it("handles an empty list without member queries", async () => {
    db.setResult("shared_habits", "select", {
      data: [],
      error: null,
      count: 0,
    });
    const res = await request(app)
      .get("/shared-habits")
      .set("Authorization", auth);
    expect(res.body.habits).toEqual([]);
    expect(db.callsFor("shared_habit_members_info", "select")).toHaveLength(0);
  });
  it("lists the caller's own progress and membership date even when someone else owns the habit", async () => {
    db.setResult("shared_habits", "select", {
      data: [
        {
          ...habit,
          owner_id: other,
          start_date: "2026-11-17",
          join_by: "2026-11-17",
        },
      ],
      error: null,
      count: 1,
    });
    db.setResult("shared_habit_members_info", "select", {
      data: [
        { ...members[0], is_owner: false, timezone: "Asia/Tokyo" },
        { ...members[1], is_owner: true, timezone: "America/Los_Angeles" },
      ],
      error: null,
    });
    db.setResult("shared_habit_member_logs", "select", {
      data: [
        { user_id: TEST_USER.id, occurred_on: "2026-11-18", count: 1 },
        { user_id: other, occurred_on: "2026-11-17", count: 3 },
      ],
      error: null,
    });
    const res = await request(app)
      .get("/shared-habits")
      .set("Authorization", auth);
    expect(res.status).toBe(200);
    expect(res.body.habits[0]).toMatchObject({
      member_count: 2,
      own_today: "2026-11-18",
      stats: { today: "2026-11-17", current_period: { count: 1.5 } },
      own_stats: { current_period: { count: 1 } },
    });
    expect(db.callsFor("profiles", "select")).toHaveLength(0);
    expect(db.callsFor("shared_habit_logs", "select")).toHaveLength(0);
  });
  it("pages through aggregate logs without losing counts", async () => {
    db.queueResult("shared_habit_member_logs", "select", {
      data: Array(500).fill({
        user_id: other,
        occurred_on: "2026-11-18",
        count: 1,
      }),
      error: null,
    });
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.members[1].current_period_count).toBe(502);
    expect(db.callsFor("shared_habit_member_logs", "select")[1]?.range).toEqual(
      { from: 500, to: 999 },
    );
  });
  it.each([
    "shared_habits",
    "shared_habit_members_info",
    "shared_habit_member_logs",
    "shared_habit_logs",
  ])("fails safely when %s cannot be read", async (table) => {
    db.setResult(table, "select", {
      data: null,
      error: { message: "private failure" },
    });
    const res = await get();
    expect(res.status).toBe(500);
    expect(res.text).not.toContain("private failure");
  });
  it("returns 500 when creation fails", async () => {
    db.setResult("shared_habits", "insert", {
      data: null,
      error: { message: "failed" },
    });
    expect((await post(input)).status).toBe(500);
  });
  it("requires auth and validates ids and pagination", async () => {
    expect((await request(app).post("/shared-habits").send(input)).status).toBe(
      401,
    );
    expect((await request(app).get("/shared-habits")).status).toBe(401);
    expect((await request(app).get(`/shared-habits/${id}`)).status).toBe(401);
    expect(
      (await request(app).get("/shared-habits/bad").set("Authorization", auth))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get("/shared-habits?limit=0")
          .set("Authorization", auth)
      ).status,
    ).toBe(400);
  });

  it("returns real log ids only for the caller and uses their saved member timezone", async () => {
    db.setResult("shared_habits", "select", {
      data: { ...habit, start_date: "2026-11-17" },
      error: null,
    });
    db.setResult("shared_habit_logs", "select", {
      data: [{ id: "my-log", occurred_on: "2026-11-17" }],
      error: null,
    });
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.own_stats.current_period.number).toBe(1);
    expect(res.body.own_today).toBe("2026-11-17");
    expect(res.body.own_stats.current_period_logs).toEqual([
      { id: "my-log", occurred_on: "2026-11-17" },
    ]);
    expect(res.body.members[1]).not.toHaveProperty("log_days");
    // Detail does not consult a possibly changed profile timezone.
    expect(db.callsFor("profiles", "select")).toHaveLength(0);
  });
  it("skips a membership lost during listing without hiding database failures", async () => {
    const second = { ...habit, id: "8d3f9c1e-5b2a-4c8e-9f41-2a6b8d0e1c33" };
    db.setResult("shared_habits", "select", {
      data: [habit, second],
      count: 2,
      error: null,
    });
    db.queueResult("shared_habit_members_info", "select", {
      data: [],
      error: null,
    });
    const res = await request(app)
      .get("/shared-habits")
      .set("Authorization", auth);
    expect(res.status).toBe(200);
    expect(res.body.habits.map((h: { id: string }) => h.id)).toEqual([
      second.id,
    ]);
    expect(res.body.total).toBe(2); // Initial database snapshot, not a new count.
    db.setResult("shared_habit_members_info", "select", {
      data: null,
      error: { message: "failed" },
    });
    expect(
      (await request(app).get("/shared-habits").set("Authorization", auth))
        .status,
    ).toBe(500);
  });

  it("shares invite codes with non-owner members and preserves fractional group counts", async () => {
    db.setResult("shared_habits", "select", {
      data: { ...habit, owner_id: other },
      error: null,
    });
    db.setResult("shared_habit_member_logs", "select", {
      data: [{ user_id: other, occurred_on: "2026-11-18", count: 1 }],
      error: null,
    });
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.join_code).toBe("secret-code");
    expect(res.body.stats.current_period.count).toBe(0.5);
  });

  it("pages caller logs and preserves the profile lookup used for creation dates", async () => {
    await post(input);
    expect(db.callsFor("profiles", "select")[0]?.filter).toEqual({
      column: "id",
      value: TEST_USER.id,
    });
    db.queueResult("shared_habit_logs", "select", {
      data: Array.from({ length: 500 }, (_, i) => ({
        id: String(i),
        occurred_on: "2026-11-18",
      })),
      error: null,
    });
    db.setResult("shared_habit_logs", "select", {
      data: [{ id: "last", occurred_on: "2026-11-18" }],
      error: null,
    });
    const res = await get();
    expect(res.body.own_stats.log_days).toEqual([
      { date: "2026-11-18", count: 501 },
    ]);
    expect(db.callsFor("shared_habit_logs", "select")[1]?.range).toEqual({
      from: 500,
      to: 999,
    });
  });
  it.each(["2026-11-18T12:00:00Z", "2026-11-19T12:00:00Z"])(
    "ignores pre-start logs consistently on %s",
    async (instant) => {
      vi.setSystemTime(new Date(instant));
      const valid = [{ id: "valid", occurred_on: "2026-11-18" }];
      const invalid = { id: "early", occurred_on: "2026-11-17" };
      const summaries = members.map((member) => ({
        user_id: member.user_id,
        occurred_on: "2026-11-18",
        count: 1,
      }));
      db.setResult("shared_habit_member_logs", "select", {
        data: summaries,
        error: null,
      });
      db.setResult("shared_habit_logs", "select", { data: valid, error: null });
      const baseline = await get();
      expect(baseline.status).toBe(200);
      db.setResult("shared_habit_member_logs", "select", {
        data: [
          ...summaries,
          ...members.map((member) => ({
            user_id: member.user_id,
            occurred_on: "2026-11-17",
            count: 20,
          })),
        ],
        error: null,
      });
      db.setResult("shared_habit_logs", "select", {
        data: [invalid, ...valid],
        error: null,
      });
      const res = await get();
      expect(res.status).toBe(200);
      // Includes group count/health, every member summary, and caller calendar,
      // consistency, streak, progress, and deletable log ids.
      expect(res.body).toEqual(baseline.body);
      expect(res.body.own_stats.log_days).toEqual([
        { date: "2026-11-18", count: 1 },
      ]);
      db.setResult("shared_habits", "select", {
        data: [habit],
        count: 1,
        error: null,
      });
      const list = await request(app)
        .get("/shared-habits")
        .set("Authorization", auth);
      expect(list.status).toBe(200);
      expect(list.body.habits[0].stats).toEqual(baseline.body.stats);
    },
  );
});
