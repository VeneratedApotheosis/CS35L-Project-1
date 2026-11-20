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
  db.setResult("delete_shared_habit_member", "select", {
    data: null,
    error: null,
  });
  db.setResult("transfer_shared_habit_ownership", "select", {
    data: null,
    error: null,
  });
});
describe("shared habit membership", () => {
  it("leaves through the locked RPC, keeping logs", async () => {
    expect((await leave()).status).toBe(204);
    expect(
      db.callsFor("delete_shared_habit_member", "select")[0]?.payload,
    ).toEqual({
      p_shared_habit_id: id,
      p_user_id: self,
      p_leave: true,
    });
    expect(db.callsFor("shared_habit_members", "delete")).toHaveLength(0);
    expect(db.callsFor("shared_habit_logs", "delete")).toHaveLength(0);
  });
  it("removes through the locked RPC", async () => {
    expect((await remove()).status).toBe(204);
    expect(
      db.callsFor("delete_shared_habit_member", "select")[0]?.payload,
    ).toEqual({
      p_shared_habit_id: id,
      p_user_id: other,
      p_leave: false,
    });
  });
  it.each([
    ["shared_habit_not_found", 404],
    ["shared_habit_member_not_found", 404],
    ["shared_habit_not_owner", 403],
    ["shared_habit_owner_cannot_leave", 400],
    ["shared_habit_invalid_request", 400],
    ["private error", 500],
  ] as const)("maps deletion error %s", async (message, status) => {
    db.setResult("delete_shared_habit_member", "select", {
      data: null,
      error: { message },
    });
    const res = await remove();
    expect(res.status).toBe(status);
    if (status === 500) expect(res.text).not.toContain(message);
  });
  it("maps an owner attempting to leave to 400", async () => {
    db.setResult("delete_shared_habit_member", "select", {
      data: null,
      error: { message: "shared_habit_owner_cannot_leave" },
    });
    expect((await leave()).status).toBe(400);
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
    db.setResult("delete_shared_habit_member", "select", {
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
