// Disposable local Supabase HTTP integration test; never accepts a hosted URL.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

const supabaseUrl = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const apiUrl = process.env.TEST_API_URL ?? "http://127.0.0.1:31973";
for (const url of [supabaseUrl, apiUrl]) {
  if (
    !url ||
    !["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)
  )
    throw new Error("Use only an isolated local Supabase project and backend");
}
if (!key) throw new Error("Set SUPABASE_PUBLISHABLE_KEY to the local key");

async function createUser() {
  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signUp({
    email: `${randomUUID()}@local.test`,
    password: "local-test-password-123",
  });
  if (error || !data.session)
    throw new Error(`Local signup failed: ${error?.message ?? "no session"}`);
  return { token: data.session.access_token };
}
async function api(user, method, path, status, body) {
  const response = await fetch(apiUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${user.token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(
    response.status,
    status,
    `${method} ${path}: got ${response.status}, expected ${status}`,
  );
  return response.status === 204 ? null : response.json();
}
const users = [];
let habit;
try {
  const a = await createUser();
  users.push(a);
  const b = await createUser();
  users.push(b);
  const date = (n) => DateTime.utc().plus({ days: n }).toISODate();
  habit = await api(a, "POST", "/shared-habits", 201, {
    name: "Local management test",
    plant_type: "pothos",
    target_count: 2,
    interval_count: 1,
    interval_unit: "week",
    num_periods: 2,
    start_date: date(3),
    join_by: date(2),
    max_members: 4,
  });
  const path = `/shared-habits/${habit.id}`;
  const original = habit.join_code;
  assert.equal(
    (await api(a, "PATCH", path, 200, { target_count: 3, description: null }))
      .target_count,
    3,
  );
  await api(b, "PATCH", path, 404, { name: "forged" });
  await api(a, "DELETE", `${path}/code`, 204);
  await api(b, "GET", `/shared-habits/join/${original}`, 404);
  await api(a, "PATCH", path, 200, { join_by: date(1) });
  await api(b, "GET", `/shared-habits/join/${original}`, 404);
  const rotated = (await api(a, "POST", `${path}/code`, 200)).join_code;
  assert.match(rotated, /^[0-9a-f]{32}$/);
  assert.notEqual(rotated, original);
  await api(b, "POST", `/shared-habits/join/${rotated}`, 200);
  await api(a, "PATCH", path, 400, { target_count: 4 });
  await api(a, "PATCH", path, 200, {
    name: "Updated together",
    join_by: date(2),
  });
  await api(b, "DELETE", path, 404);
  await api(a, "DELETE", path, 204);
  habit = null;
  console.log(
    "PASS: real local HTTP and Supabase create, edit, join, invite rotation, authorization and deletion",
  );
} finally {
  if (habit && users[0])
    await api(users[0], "DELETE", `/shared-habits/${habit.id}`, 204);
  for (const user of users.reverse()) await api(user, "DELETE", "/me", 204);
}
