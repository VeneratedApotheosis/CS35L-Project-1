import { logger } from "../lib/logger.js";
import request from "supertest";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { app } from "../app.js";
import { fakeSupabase as db, GOOD_TOKEN } from "../test/fakeSupabase.js";
vi.mock("../lib/supabase.js", async () => {
  const { fakeSupabase } = await import("../test/fakeSupabase.js");
  return { createUserClient: () => fakeSupabase.client };
});
const code = "a".repeat(32);
const id = "7d3f9c1e-5b2a-4c8e-9f41-2a6b8d0e1c33";
const url = "/shared-habits/join/" + code;
const auth = "Bearer " + GOOD_TOKEN;
const preview = {
  name: "Walk",
  description: null,
  plant_type: "pothos",
  target_count: 1,
  interval_count: 1,
  interval_unit: "day",
  num_periods: 4,
  start_date: "2026-11-19",
  join_by: "2026-11-18",
  owner_display_name: "Sam",
  member_count: 1,
  max_members: 2,
};
let clock = Date.parse("2026-11-19T02:00:00Z");
beforeEach(() => {
  db.reset();
  clock += 61_000; // Expire the process-local limiter between tests.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
  db.setResult("profiles", "select", {
    data: { timezone: "America/Los_Angeles" },
    error: null,
  });
  db.setResult("shared_habit_preview", "select", {
    data: [preview],
    error: null,
  });
  db.setResult("join_shared_habit", "select", { data: id, error: null });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("previews using local today and reports remaining places", async () => {
  const res = await request(app).get(url).set("Authorization", auth);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ...preview, places_left: 1 });
  db.setResult("profiles", "select", {
    data: { timezone: "UTC" },
    error: null,
  });
  expect((await request(app).get(url).set("Authorization", auth)).status).toBe(
    404,
  );
});
it("hides unknown and malformed codes behind the same error", async () => {
  db.setResult("shared_habit_preview", "select", { data: [], error: null });
  const missing = await request(app).get(url).set("Authorization", auth);
  const malformed = await request(app)
    .get("/shared-habits/join/bad")
    .set("Authorization", auth);
  expect(missing.status).toBe(404);
  expect(malformed.body).toEqual(missing.body);
});
it.each([
  ["shared_habit_not_found", 404],
  ["shared_habit_full", 409],
  ["shared_habit_join_ended", 400],
  ["private SQL details", 500],
])("maps %s to %s", async (message, status) => {
  db.setResult("join_shared_habit", "select", {
    data: null,
    error: { message },
  });
  const res = await request(app).post(url).set("Authorization", auth);
  expect(res.status).toBe(status);
  expect(res.text).not.toContain("private SQL");
});
it("joining twice returns the same id without a preview precheck", async () => {
  for (let i = 0; i < 2; i++) {
    const res = await request(app).post(url).set("Authorization", auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id });
  }
  expect(db.callsFor("shared_habit_preview", "select")).toHaveLength(0);
  expect(db.callsFor("join_shared_habit", "select")[0]?.payload).toEqual({
    p_code: code,
  });
});
it("honors a cap-race loser from the locked join RPC", async () => {
  db.queueResult("join_shared_habit", "select", { data: id, error: null });
  db.setResult("join_shared_habit", "select", {
    data: null,
    error: { message: "shared_habit_full" },
  });
  const results = await Promise.all(
    [1, 2].map(() => request(app).post(url).set("Authorization", auth)),
  );
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(db.callsFor("shared_habit_members", "insert")).toHaveLength(0);
});
it("limits guesses across preview and join and resets after the window", async () => {
  db.setResult("shared_habit_preview", "select", { data: [], error: null });
  db.setResult("join_shared_habit", "select", {
    data: null,
    error: { message: "shared_habit_not_found" },
  });
  for (let i = 0; i < 20; i++) {
    const req = i % 2 ? request(app).post(url) : request(app).get(url);
    expect((await req.set("Authorization", auth)).status).toBe(404);
  }
  const blocked = await request(app).get(url).set("Authorization", auth);
  expect(blocked.status).toBe(429);
  expect(blocked.headers["retry-after"]).toBeTruthy();
  expect(db.callsFor("shared_habit_preview", "select")).toHaveLength(10);
  vi.setSystemTime(clock + 60_001);
  expect((await request(app).get(url).set("Authorization", auth)).status).toBe(
    404,
  );
});
it("requires authentication for both routes", async () => {
  expect((await request(app).get(url)).status).toBe(401);
  expect((await request(app).post(url)).status).toBe(401);
});

it.each(["shared_habit_preview", "join_shared_habit"])(
  "logs safe diagnostics for unexpected %s errors",
  async (operation) => {
    const logged = vi.spyOn(logger, "error").mockImplementation(() => {});
    db.setResult(operation, "select", {
      data: null,
      error: { code: "XX000", message: "query included " + code },
    });
    const req =
      operation === "shared_habit_preview"
        ? request(app).get(url)
        : request(app).post(url);
    const res = await req.set("Authorization", auth);
    expect(res.status).toBe(500);
    expect(res.text).not.toContain(code);
    expect(logged).toHaveBeenCalledWith(
      { operation, sqlState: "XX000" },
      "unexpected invite RPC failure",
    );
    expect(JSON.stringify(logged.mock.calls)).not.toContain(code);
  },
);

it("redacts paths and raw exceptions on unexpected thrown errors", async () => {
  const logged = vi.spyOn(logger, "error").mockImplementation(() => {});
  vi.spyOn(db.client, "rpc").mockImplementationOnce(() => {
    throw new Error("invite " + code);
  });
  const res = await request(app).post(url).set("Authorization", auth);
  expect(res.status).toBe(500);
  expect(logged).toHaveBeenCalledWith(
    {
      errorType: "invite_request_failure",
      path: "/shared-habits/join/[REDACTED]",
    },
    "unhandled error",
  );
  expect(JSON.stringify(logged.mock.calls)).not.toContain(code);
});
