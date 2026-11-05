import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "./app.js";
import { fakeSupabase, GOOD_TOKEN } from "./test/fakeSupabase.js";

vi.mock("./lib/supabase.js", async () => {
  const { fakeSupabase } = await import("./test/fakeSupabase.js");
  return { createUserClient: () => fakeSupabase.client };
});

beforeEach(() => fakeSupabase.reset());

describe("app", () => {
  it("answers GET /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: "unauthorized", message: "Missing token" },
    });
  });

  it("returns 401 for an invalid token", async () => {
    const res = await request(app)
      .get("/me")
      .set("Authorization", "Bearer bad");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: "unauthorized", message: "Invalid token" },
    });
  });

  it("returns 404 for an unknown route", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "not_found", message: "Route not found" },
    });
  });

  it("returns 400 bad_request for invalid JSON", async () => {
    const res = await request(app)
      .post("/habits")
      .set("Authorization", `Bearer ${GOOD_TOKEN}`)
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("bad_request");
  });

  it("never echoes the authorization header", async () => {
    const secret = "Bearer secret-token-value";
    const responses = [
      await request(app).get("/me").set("Authorization", secret),
      await request(app).get("/nope").set("Authorization", secret),
      await request(app)
        .post("/habits")
        .set("Authorization", secret)
        .set("Content-Type", "application/json")
        .send("{bad"),
    ];
    for (const res of responses) {
      const everything = JSON.stringify({
        text: res.text,
        headers: res.headers,
      });
      expect(everything).not.toContain("secret-token-value");
    }
  });
});
