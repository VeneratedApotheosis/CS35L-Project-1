import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
const auth = `Bearer ${GOOD_TOKEN}`;
const base = `/shared-habits/${id}`;
const patch = (body: object) =>
  request(app).patch(base).set("Authorization", auth).send(body);
const regenerate = () =>
  request(app).post(`${base}/code`).set("Authorization", auth);
const close = () =>
  request(app).delete(`${base}/code`).set("Authorization", auth);
const remove = () => request(app).delete(base).set("Authorization", auth);
beforeEach(() => {
  db.reset();
  db.setResult("shared_habits", "update", {
    data: { id, name: "Updated", join_code: "abc" },
    error: null,
  });
  db.setResult("shared_habits", "delete", { data: { id }, error: null });
});
describe("shared habit management routes", () => {
  it("validates and passes a patch, including clear description, to the owner's update", async () => {
    expect(
      (
        await patch({
          name: "  Updated ",
          description: null,
          join_by: "2026-12-01",
        })
      ).status,
    ).toBe(200);
    const call = db.callsFor("shared_habits", "update")[0];
    expect(call?.payload).toEqual({
      name: "Updated",
      description: null,
      join_by: "2026-12-01",
    });
    expect(call?.moreFilters).toContainEqual({
      column: "owner_id",
      value: TEST_USER.id,
    });
  });
  it.each([
    "shared_habit_started",
    "shared_habit_goal_locked",
    "shared_habit_cap_below_members",
    "shared_habit_invalid_dates",
  ])("maps database state rejection %s to 400", async (message) => {
    db.setResult("shared_habits", "update", { data: null, error: { message } });
    expect((await patch({ name: "Changed" })).status).toBe(400);
  });
  it("rejects invalid and forged inputs before a database update", async () => {
    for (const body of [
      {},
      { join_code: "forged" },
      { max_members: 1 },
      { start_date: "2026-02-30" },
    ])
      expect((await patch(body)).status).toBe(400);
    expect(db.callsFor("shared_habits", "update")).toHaveLength(0);
  });
  it("generates a fresh 128-bit code and closes joining with null", async () => {
    expect((await regenerate()).status).toBe(200);
    expect((await regenerate()).status).toBe(200);
    const updates = db.callsFor("shared_habits", "update");
    const code = (updates[0]?.payload as { join_code: string }).join_code;
    expect(code).toMatch(/^[0-9a-f]{32}$/);
    expect((updates[1]?.payload as { join_code: string }).join_code).not.toBe(
      code,
    );
    expect((await close()).status).toBe(204);
    expect(db.callsFor("shared_habits", "update")[2]?.payload).toEqual({
      join_code: null,
    });
  });
  it("maps started invite management and permits owner deletion", async () => {
    db.setResult("shared_habits", "update", {
      data: null,
      error: { message: "shared_habit_started" },
    });
    expect((await regenerate()).status).toBe(400);
    expect((await close()).status).toBe(400);
    expect((await remove()).status).toBe(204);
    expect(
      db.callsFor("shared_habits", "delete")[0]?.moreFilters,
    ).toContainEqual({ column: "owner_id", value: TEST_USER.id });
  });
  it("hides non-owner or missing habits for every operation", async () => {
    db.setResult("shared_habits", "update", { data: null, error: null });
    db.setResult("shared_habits", "delete", { data: null, error: null });
    expect((await patch({ name: "Changed" })).status).toBe(404);
    expect((await regenerate()).status).toBe(404);
    expect((await close()).status).toBe(404);
    expect((await remove()).status).toBe(404);
  });
  it("does not leak database errors and requires authentication", async () => {
    db.setResult("shared_habits", "update", {
      data: null,
      error: { message: "private" },
    });
    db.setResult("shared_habits", "delete", {
      data: null,
      error: { message: "private" },
    });
    for (const response of [
      await patch({ name: "Changed" }),
      await regenerate(),
      await close(),
      await remove(),
    ]) {
      expect(response.status).toBe(500);
      expect(response.text).not.toContain("private");
    }
    expect((await request(app).patch(base).send({ name: "x" })).status).toBe(
      401,
    );
    expect((await request(app).delete(base)).status).toBe(401);
    expect((await request(app).post(`${base}/code`)).status).toBe(401);
  });
});
