import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => fakeSupabase.reset());

describe("GET /me", () => {
  it("returns the user and the profile", async () => {
    fakeSupabase.setResult("profiles", "select", {
      data: profile,
      error: null,
    });

    const res = await request(app).get("/me").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: TEST_USER.id,
      email: TEST_USER.email,
      display_name: "Sam",
      avatar_url: null,
      timezone: "America/Los_Angeles",
    });
    expect(fakeSupabase.calls).toEqual([
      {
        table: "profiles",
        operation: "select",
        columns: "id, display_name, avatar_url, timezone",
        filter: { column: "id", value: TEST_USER.id },
      },
    ]);
  });

  it("returns 404 when the profile is missing", async () => {
    fakeSupabase.setResult("profiles", "select", {
      data: null,
      error: { message: "no rows", code: "PGRST116" },
    });

    const res = await request(app).get("/me").set("Authorization", auth);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});

describe("PATCH /me", () => {
  it("updates the profile with exactly the patch", async () => {
    fakeSupabase.setResult("profiles", "update", {
      data: profile,
      error: null,
    });

    const res = await request(app)
      .patch("/me")
      .set("Authorization", auth)
      .send({ timezone: "America/Los_Angeles" });

    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe("America/Los_Angeles");
    const updates = fakeSupabase.callsFor("profiles", "update");
    expect(updates).toHaveLength(1);
    expect(updates[0]?.payload).toStrictEqual({
      timezone: "America/Los_Angeles",
    });
    expect(updates[0]?.filter).toEqual({ column: "id", value: TEST_USER.id });
  });

  it("returns 400 when the database rejects the timezone", async () => {
    fakeSupabase.setResult("profiles", "update", {
      data: null,
      error: { message: "Invalid timezone: Mars/Base" },
    });

    const res = await request(app)
      .patch("/me")
      .set("Authorization", auth)
      .send({ timezone: "America/Los_Angeles" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
  });

  it("returns 400 for an empty body without touching the database", async () => {
    const res = await request(app)
      .patch("/me")
      .set("Authorization", auth)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
    expect(fakeSupabase.callsFor("profiles", "update")).toHaveLength(0);
    expect(fakeSupabase.calls).toHaveLength(0);
  });
});

describe("DELETE /me", () => {
  it("deletes the account through delete_my_account and returns 204", async () => {
    fakeSupabase.setResult("delete_my_account", "select", { data: null, error: null });

    const res = await request(app).delete("/me").set("Authorization", auth);

    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    // No id is sent: the function can only delete the caller.
    expect(fakeSupabase.calls).toEqual([
      { table: "delete_my_account", operation: "select", payload: {} },
    ]);
  });

  it("returns 401 without a token and does not delete anything", async () => {
    const res = await request(app).delete("/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
    expect(fakeSupabase.calls).toHaveLength(0);
  });

  it("returns 401 for a bad token and does not delete anything", async () => {
    const res = await request(app)
      .delete("/me")
      .set("Authorization", "Bearer bad-token");

    expect(res.status).toBe(401);
    expect(fakeSupabase.calls).toHaveLength(0);
  });

  it("returns 500 in the error envelope when the database fails", async () => {
    fakeSupabase.setResult("delete_my_account", "select", {
      data: null,
      error: { message: "boom" },
    });

    const res = await request(app).delete("/me").set("Authorization", auth);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal_error");
    expect(JSON.stringify(res.body)).not.toContain("boom");
  });
});
