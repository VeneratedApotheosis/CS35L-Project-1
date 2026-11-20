import "dotenv/config";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};
const supabaseUrl = required("SUPABASE_URL");
const key = required("SUPABASE_PUBLISHABLE_KEY");
const baseUrl = (process.env.TEST_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

async function signIn(label) {
  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: required(`TEST_USER_${label}_EMAIL`),
    password: required(`TEST_USER_${label}_PASSWORD`),
  });
  if (error || !data.session)
    throw new Error(`Sign-in failed for user ${label}`);
  return { client, token: data.session.access_token, id: data.user.id };
}

async function api(user, method, path, expected, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${user.token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: expected ${expected}, got ${response.status}`,
  );
  return response.status === 204 ? null : response.json();
}

async function main() {
  const [a, b, c] = await Promise.all(["A", "B", "C"].map(signIn));
  assert.equal(
    new Set([a.id, b.id, c.id]).size,
    3,
    "Test accounts must be distinct",
  );
  const profiles = await Promise.all(
    [a, b].map((user) => api(user, "GET", "/me", 200)),
  );
  const dates = profiles.map((profile) =>
    DateTime.now()
      .setZone(profile.timezone ?? "UTC")
      .toISODate(),
  );
  assert.ok(
    dates[0] && dates[0] === dates[1],
    "Users A and B must have the same local date for this test; try again when their dates match",
  );

  let habitId;
  try {
    const habit = await api(a, "POST", "/shared-habits", 201, {
      name: `Live logging test ${Date.now()}`,
      plant_type: "pothos",
      target_count: 2,
      interval_count: 1,
      interval_unit: "week",
      num_periods: 2,
      start_date: dates[0],
      join_by: dates[0],
      max_members: 3,
    });
    habitId = habit.id;
    assert.ok(
      habitId && habit.join_code,
      "Creation must return an id and invite code",
    );
    await api(b, "POST", `/shared-habits/join/${habit.join_code}`, 200);
    const path = `/shared-habits/${habitId}/logs`;

    const first = await api(a, "POST", path, 201, {});
    assert.equal(first.own_stats.current_period.count, 1);
    assert.equal(first.stats.current_period.count, 0.5);
    const second = await api(b, "POST", path, 201, {});
    assert.equal(second.own_stats.current_period.count, 1);
    assert.equal(second.stats.current_period.count, 1);
    const third = await api(b, "POST", path, 201, {});
    assert.equal(third.own_stats.current_period.count, 2);
    assert.equal(third.stats.current_period.count, 1.5);
    assert.equal(third.stats.overall_progress, 0.375);

    await api(b, "DELETE", `${path}/${first.log.id}`, 404);
    await api(c, "POST", path, 404, {});
    await api(c, "DELETE", `${path}/${first.log.id}`, 404);
    await api(a, "POST", path, 400, {
      occurred_on: DateTime.fromISO(dates[0]).minus({ days: 1 }).toISODate(),
    });
    await api(a, "POST", path, 400, {
      occurred_on: DateTime.fromISO(dates[0]).plus({ days: 1 }).toISODate(),
    });

    // This tests database RLS directly, independently of the Express route.
    const { data: otherLogs, error: readError } = await b.client
      .from("shared_habit_logs")
      .select("id")
      .eq("id", first.log.id);
    assert.ifError(readError);
    assert.deepEqual(otherLogs, [], "RLS must hide A's log from B");

    const after = await api(b, "DELETE", `${path}/${third.log.id}`, 200);
    assert.equal(after.own_stats.current_period.count, 1);
    assert.equal(after.stats.current_period.count, 1);
    assert.equal(after.stats.overall_progress, 0.25);
    console.log("PASS: live shared habit logging, stats, permissions, and RLS");
  } finally {
    if (habitId) {
      // The owner policy allows deleting the temporary habit and cascading its logs.
      const { data, error } = await a.client
        .from("shared_habits")
        .delete()
        .eq("id", habitId)
        .select("id");
      if (error || data?.length !== 1) {
        console.error(
          `Cleanup failed: remove temporary shared habit ${habitId} as user A`,
        );
        process.exitCode = 1;
      } else {
        console.log("Removed temporary shared habit");
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
