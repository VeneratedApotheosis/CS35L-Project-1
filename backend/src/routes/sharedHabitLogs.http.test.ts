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
const logId = "22222222-2222-4222-8222-222222222222";
const auth = `Bearer ${GOOD_TOKEN}`;
const habit = {
  id,
  owner_id: TEST_USER.id,
  start_date: "2026-11-18",
  interval_count: 1,
  interval_unit: "week",
  num_periods: 2,
  target_count: 2,
};
const member = {
  user_id: TEST_USER.id,
  timezone: "America/Los_Angeles",
  is_owner: true,
};
const log = {
  id: logId,
  shared_habit_id: id,
  user_id: TEST_USER.id,
  occurred_on: "2026-11-19",
};
const post = (body = {}) =>
  request(app)
    .post(`/shared-habits/${id}/logs`)
    .set("Authorization", auth)
    .send(body);
const del = () =>
  request(app)
    .delete(`/shared-habits/${id}/logs/${logId}`)
    .set("Authorization", auth);

beforeEach(() => {
  db.reset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-20T02:00:00Z"));
  db.setResult("shared_habits", "select", { data: habit, error: null });
  db.setResult("shared_habit_members_info", "select", {
    data: [member],
    error: null,
  });
  db.setResult("shared_habit_member_logs", "select", {
    data: [{ user_id: TEST_USER.id, occurred_on: "2026-11-19", count: 1 }],
    error: null,
  });
  db.setResult("shared_habit_logs", "insert", { data: log, error: null });
  db.setResult("shared_habit_logs", "select", { data: log, error: null });
  db.setResult("shared_habit_logs", "delete", {
    data: { id: logId },
    error: null,
  });
});
afterEach(() => vi.useRealTimers());

describe("shared habit logging", () => {
  it("logs the caller's local today and returns group and caller stats", async () => {
    const res = await post();
    expect(res.status).toBe(201);
    expect(res.body.log).toEqual(log);
    expect(res.body.stats.current_period.count).toBe(1);
    expect(res.body.own_stats.current_period.count).toBe(1);
    expect(db.callsFor("shared_habit_logs", "insert")[0]?.payload).toEqual({
      shared_habit_id: id,
      user_id: TEST_USER.id,
      occurred_on: "2026-11-19",
    });
  });
  it("deletes an own current-period log and returns updated stats", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stats");
    expect(res.body).toHaveProperty("own_stats");
    expect(
      db.callsFor("shared_habit_logs", "delete")[0]?.moreFilters,
    ).toContainEqual({ column: "user_id", value: TEST_USER.id });
  });
  it.each(["2026-11-17", "2026-11-20", "2026-02-30"])(
    "rejects invalid or outside dates %s",
    async (occurred_on) => {
      expect((await post({ occurred_on })).status).toBe(400);
      expect(db.callsFor("shared_habit_logs", "insert")).toHaveLength(0);
    },
  );
  it("rejects before start, past periods, and expired habits", async () => {
    vi.setSystemTime(new Date("2026-11-18T02:00:00Z"));
    expect((await post()).status).toBe(400);
    vi.setSystemTime(new Date("2026-11-26T20:00:00Z"));
    expect((await post({ occurred_on: "2026-11-24" })).status).toBe(400);
    vi.setSystemTime(new Date("2026-12-03T20:00:00Z"));
    expect((await post()).status).toBe(400);
    expect((await del()).status).toBe(400);
  });
  it("returns 404 for missing membership or another member's log", async () => {
    db.setResult("shared_habit_logs", "select", { data: null, error: null });
    expect((await del()).status).toBe(404);
    expect(
      db.callsFor("shared_habit_logs", "select")[0]?.moreFilters,
    ).toContainEqual({ column: "user_id", value: TEST_USER.id });
    db.setResult("shared_habit_members_info", "select", {
      data: [],
      error: null,
    });
    expect((await post()).status).toBe(404);
  });
  it("rejects deletion of a locked period", async () => {
    vi.setSystemTime(new Date("2026-11-26T20:00:00Z"));
    expect((await del()).status).toBe(400);
    expect(db.callsFor("shared_habit_logs", "delete")).toHaveLength(0);
  });
  it("handles failed writes and a concurrent deletion", async () => {
    db.setResult("shared_habit_logs", "insert", {
      data: null,
      error: { message: "private error" },
    });
    const res = await post();
    expect(res.status).toBe(500);
    expect(res.text).not.toContain("private error");
    db.setResult("shared_habit_logs", "delete", { data: null, error: null });
    expect((await del()).status).toBe(404);
  });
  it("requires authentication and validates request fields", async () => {
    expect((await request(app).post(`/shared-habits/${id}/logs`)).status).toBe(
      401,
    );
    expect((await post({ user_id: logId })).status).toBe(400);
    expect(
      (
        await request(app)
          .delete(`/shared-habits/${id}/logs/bad`)
          .set("Authorization", auth)
      ).status,
    ).toBe(400);
  });
});
