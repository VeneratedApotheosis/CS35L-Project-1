import "dotenv/config";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import {
  requireLocalFixture,
  setLocalFixtureDates,
} from "./shared-habit-local-fixture.mjs";

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
requireLocalFixture(supabaseUrl, baseUrl);

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
  assert.equal(new Set([a.id, b.id, c.id]).size, 3);
  const profiles = await Promise.all(
    [a, b, c].map((user) => api(user, "GET", "/me", 200)),
  );
  const dates = profiles.map((profile) =>
    DateTime.now()
      .setZone(profile.timezone ?? "UTC")
      .toISODate(),
  );
  assert.ok(
    dates[0] && dates.every((date) => date === dates[0]),
    "All three users need the same local date; try again when their dates match",
  );

  let habitId;
  let owner = a;
  try {
    const habit = await api(a, "POST", "/shared-habits", 201, {
      name: `Live membership test ${Date.now()}`,
      plant_type: "pothos",
      target_count: 2,
      interval_count: 1,
      interval_unit: "week",
      num_periods: 2,
      start_date: DateTime.fromISO(dates[0]).plus({ days: 2 }).toISODate(),
      join_by: DateTime.fromISO(dates[0]).plus({ days: 1 }).toISODate(),
      max_members: 3,
    });
    habitId = habit.id;
    assert.ok(habitId && habit.join_code);
    const base = `/shared-habits/${habitId}`;
    await api(b, "POST", `/shared-habits/join/${habit.join_code}`, 200);
    await api(c, "POST", `/shared-habits/join/${habit.join_code}`, 200);
    // Direct table DELETE must be denied even for a current member or owner.
    for (const actor of [a, b]) {
      const { error: directError } = await actor.client
        .from("shared_habit_members")
        .delete()
        .eq("shared_habit_id", habitId)
        .eq("user_id", b.id);
      assert.ok(directError, "Direct membership deletion must be denied");
    }
    // Race the two RPCs in both launch orders. The delay biases the order but
    // does not prove lock waiting; unexpected scheduling fails the test.
    for (const leave of [true, false]) {
      for (const deleteFirst of [true, false]) {
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const deletion = async () => {
          if (!deleteFirst) await delay(100);
          return (leave ? b : a).client.rpc("delete_shared_habit_member", {
            p_shared_habit_id: habitId,
            p_user_id: b.id,
            p_leave: leave,
          });
        };
        const transfer = async () => {
          if (deleteFirst) await delay(100);
          return a.client.rpc("transfer_shared_habit_ownership", {
            p_shared_habit_id: habitId,
            p_new_owner: b.id,
          });
        };
        const [removed, transferred] = await Promise.all([
          deletion(),
          transfer(),
        ]);
        // Track actual ownership before any assertion so cleanup uses its owner.
        if (!transferred.error) owner = b;
        if (deleteFirst) {
          assert.ifError(removed.error);
          assert.equal(transferred.error?.message, "shared_habit_not_member");
        } else {
          assert.ifError(transferred.error);
          assert.equal(
            removed.error?.message,
            leave
              ? "shared_habit_owner_cannot_leave"
              : "shared_habit_not_owner",
          );
        }
        const snapshot = await api(a, "GET", base, 200);
        assert.ok(
          snapshot.members.some(
            (member) => member.user_id === snapshot.owner_id,
          ),
          "Owner must remain a member",
        );
        if (deleteFirst) {
          await api(b, "POST", `/shared-habits/join/${habit.join_code}`, 200);
        } else {
          await api(b, "POST", `${base}/transfer`, 204, { user_id: a.id });
          owner = a;
        }
      }
    }
    setLocalFixtureDates(habitId, dates[0], dates[0]);
    const log = await api(b, "POST", `${base}/logs`, 201, {});
    await api(b, "POST", `${base}/logs`, 201, {});
    const before = await api(a, "GET", base, 200);
    assert.equal(before.members.length, 3);
    assert.equal(before.stats.overall_progress, 1 / 6);
    await api(a, "DELETE", `${base}/members/me`, 400);
    await api(b, "DELETE", `${base}/members/${c.id}`, 403);
    await api(b, "POST", `${base}/transfer`, 403, { user_id: c.id });
    await api(a, "DELETE", `${base}/members/${c.id}`, 204);
    await api(c, "GET", base, 404);
    const afterRemove = await api(a, "GET", base, 200);
    assert.equal(afterRemove.members.length, 2);
    assert.equal(afterRemove.stats.overall_progress, 0.25);
    await api(b, "DELETE", `${base}/members/me`, 204);
    await api(b, "GET", base, 404);
    const { data: retained, error } = await b.client
      .from("shared_habit_logs")
      .select("id")
      .eq("id", log.log.id);
    assert.ifError(error);
    assert.equal(retained.length, 1, "Leaving must retain the member's logs");
    const afterLeave = await api(a, "GET", base, 200);
    assert.equal(afterLeave.members.length, 1);
    assert.equal(afterLeave.stats.overall_progress, 0);
    await api(a, "POST", `${base}/transfer`, 400, { user_id: b.id });
    // Rejoining is impossible after the real start boundary. Reset only this
    // disposable fixture to test retained logs when a member rejoins.
    setLocalFixtureDates(
      habitId,
      DateTime.fromISO(dates[0]).plus({ days: 2 }).toISODate(),
      DateTime.fromISO(dates[0]).plus({ days: 1 }).toISODate(),
    );
    await api(b, "POST", `/shared-habits/join/${habit.join_code}`, 200);
    setLocalFixtureDates(habitId, dates[0], dates[0]);
    const rejoined = await api(a, "GET", base, 200);
    assert.equal(rejoined.stats.overall_progress, 0.25);
    await api(a, "POST", `${base}/transfer`, 204, { user_id: b.id });
    owner = b;
    await api(b, "DELETE", `${base}/members/me`, 400);
    await api(a, "DELETE", `${base}/members/me`, 204);
    const final = await api(b, "GET", base, 200);
    assert.equal(final.owner_id, b.id);
    assert.equal(final.members.length, 1);
    console.log(
      "PASS: leave, remove, transfer, retained logs and current-member averages",
    );
  } finally {
    if (habitId) {
      const { data, error } = await owner.client
        .from("shared_habits")
        .delete()
        .eq("id", habitId)
        .select("id");
      if (error || data?.length !== 1) {
        console.error(
          `Cleanup failed: remove temporary shared habit ${habitId} as its owner`,
        );
        process.exitCode = 1;
      } else console.log("Removed temporary shared habit");
    }
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
