import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { fakeSupabase as db, GOOD_TOKEN } from "../test/fakeSupabase.js";

vi.mock("../lib/supabase.js", async () => {
  const { fakeSupabase } = await import("../test/fakeSupabase.js");
  return {
    createUserClient: () => ({
      ...fakeSupabase.client,
      auth: {
        getUser: async (token: string) =>
          token === "good-token"
            ? {
                data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
                error: null,
              }
            : { data: { user: null }, error: { message: "invalid" } },
      },
    }),
  };
});
const id = "7d3f9c1e-5b2a-4c8e-9f41-2a6b8d0e1c33";
const self = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const auth = `Bearer ${GOOD_TOKEN}`;
const leave = () =>
  request(app)
    .delete(`/shared-habits/${id}/members/me`)
    .set("Authorization", auth);
const remove = (target = other) =>
  request(app)
    .delete(`/shared-habits/${id}/members/${target}`)
    .set("Authorization", auth);
const transfer = (body = { user_id: other }) =>
  request(app)
    .post(`/shared-habits/${id}/transfer`)
    .set("Authorization", auth)
    .send(body);

beforeEach(() => {
  db.reset();
  db.setResult("shared_habits", "select", {
    data: { id, owner_id: self },
    error: null,
  });
  db.setResult("shared_habit_members_info", "select", {
    data: [{ user_id: self }, { user_id: other }],
    error: null,
  });
  db.setResult("shared_habit_members", "delete", {
    data: { user_id: other },
    error: null,
  });
  db.setResult("transfer_shared_habit_ownership", "select", {
    data: null,
    error: null,
  });
});
describe("shared habit membership", () => {
  it("lets a non-owner leave, retaining logs", async () => {
    db.setResult("shared_habits", "select", {
      data: { id, owner_id: other },
      error: null,
    });
    expect((await leave()).status).toBe(204);
    expect(db.callsFor("shared_habit_members", "delete")[0]).toMatchObject({
      filter: { column: "shared_habit_id", value: id },
      moreFilters: [{ column: "user_id", value: self }],
    });
    expect(db.callsFor("shared_habit_logs", "delete")).toHaveLength(0);
  });
  it("blocks an owner from leaving or removing themselves", async () => {
    expect((await leave()).status).toBe(400);
    expect((await remove(self)).status).toBe(400);
    expect(db.callsFor("shared_habit_members", "delete")).toHaveLength(0);
  });
  it("lets the owner remove a member", async () => {
    expect((await remove()).status).toBe(204);
    expect(
      db.callsFor("shared_habit_members", "delete")[0]?.moreFilters,
    ).toContainEqual({ column: "user_id", value: other });
  });
  it("forbids a member from removing anyone via the owner route", async () => {
    db.setResult("shared_habits", "select", {
      data: { id, owner_id: other },
      error: null,
    });
    expect((await remove(self)).status).toBe(403);
    expect(db.callsFor("shared_habit_members", "delete")).toHaveLength(0);
  });
  it("returns 404 for missing habits, non-members and absent targets", async () => {
    db.setResult("shared_habits", "select", { data: null, error: null });
    expect((await leave()).status).toBe(404);
    db.setResult("shared_habits", "select", {
      data: { id, owner_id: other },
      error: null,
    });
    db.setResult("shared_habit_members_info", "select", {
      data: [],
      error: null,
    });
    expect((await leave()).status).toBe(404);
    db.setResult("shared_habits", "select", {
      data: { id, owner_id: self },
      error: null,
    });
    db.setResult("shared_habit_members_info", "select", {
      data: [{ user_id: self }],
      error: null,
    });
    db.setResult("shared_habit_members", "delete", { data: null, error: null });
    expect((await remove()).status).toBe(404);
  });
  it("transfers via the authorization-enforcing RPC", async () => {
    expect((await transfer()).status).toBe(204);
    expect(
      db.callsFor("transfer_shared_habit_ownership", "select")[0]?.payload,
    ).toEqual({ p_shared_habit_id: id, p_new_owner: other });
  });
  it.each([
    ["shared_habit_not_found", 404],
    ["shared_habit_not_owner", 403],
    ["shared_habit_not_member", 400],
    ["private error", 500],
  ] as const)("maps transfer error %s", async (message, status) => {
    db.setResult("transfer_shared_habit_ownership", "select", {
      data: null,
      error: { message },
    });
    const res = await transfer();
    expect(res.status).toBe(status);
    if (status === 500) expect(res.text).not.toContain(message);
  });
  it("handles database failures and invalid requests", async () => {
    db.setResult("shared_habit_members", "delete", {
      data: null,
      error: { message: "private error" },
    });
    expect((await remove()).status).toBe(500);
    expect((await transfer({ user_id: "invalid" })).status).toBe(400);
    expect((await remove("invalid")).status).toBe(400);
    expect(
      (await request(app).delete(`/shared-habits/${id}/members/me`)).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post(`/shared-habits/${id}/transfer`)
          .send({ user_id: other })
      ).status,
    ).toBe(401);
  });
});
