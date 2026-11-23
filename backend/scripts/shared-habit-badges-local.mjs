// Isolated local Supabase integration test for issue #341. Creates disposable users.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { setLocalFixtureDates } from "./shared-habit-local-fixture.mjs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const base = process.env.TEST_API_URL ?? "http://127.0.0.1:31973";
if (
  url !== "http://127.0.0.1:54421" ||
  base !== "http://127.0.0.1:31973" ||
  !key ||
  (process.env.TEST_DB_CONTAINER &&
    process.env.TEST_DB_CONTAINER !== "supabase_db_codex-271-local-supabase")
) {
  throw new Error(
    "Only the isolated local Supabase stack on 54421 and test backend on 31973 are allowed",
  );
}
const db = (sql) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_codex-271-local-supabase",
      "psql",
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    { input: sql, encoding: "utf8" },
  ).trim();
const date = (n) => DateTime.utc().plus({ days: n }).toISODate();
async function user() {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({
    email: `${randomUUID()}@local.test`,
    password: `Local-${randomUUID()}-x`,
  });
  if (error || !data.session)
    throw new Error(`Local signup failed: ${error?.message ?? "no session"}`);
  return { id: data.user.id, token: data.session.access_token };
}
async function api(u, method, path, expected = 200, body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${u.token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  return data;
}
const users = [];
const habits = [];
try {
  const a = await user();
  users.push(a);
  const b = await user();
  users.push(b);
  const c = await user();
  users.push(c);
  async function create(name) {
    const h = await api(a, "POST", "/shared-habits", 201, {
      name,
      plant_type: "pothos",
      target_count: 1,
      interval_count: 1,
      interval_unit: "day",
      num_periods: 4,
      start_date: date(4),
      join_by: date(3),
      max_members: 3,
    });
    habits.push(h.id);
    return h;
  }
  const h = await create("341 member badges");
  await api(b, "POST", `/shared-habits/join/${h.join_code}`);
  await api(c, "POST", `/shared-habits/join/${h.join_code}`); // Later, within the pre-start window.
  const path = `/shared-habits/${h.id}`;
  assert.equal((await api(a, "GET", path)).own_stats.badge, null);
  setLocalFixtureDates(h.id, date(-10), date(-11));
  // Local privileged setup simulates historic activity; application reads use RLS/RPC.
  const start = DateTime.fromISO(date(-10), { zone: "utc" });
  const d = (n) => start.plus({ days: n }).toISODate();
  const values = [
    [a, 0],
    [a, 1],
    [a, 2],
    [a, 3],
    [b, 0],
    [b, 1],
    [b, 2],
    [c, 0],
  ]
    .map(([u, n]) => `('${h.id}','${u.id}','${d(n)}')`)
    .join(",");
  db(
    `begin; set local session_replication_role=replica; insert into public.shared_habit_logs(shared_habit_id,user_id,occurred_on) values ${values}; commit;`,
  );
  let detail = await api(a, "GET", path);
  assert.equal(detail.own_stats.badge, "gold");
  assert.equal(detail.own_stats.final_progress, 1);
  assert.equal((await api(b, "GET", path)).own_stats.badge, "bronze");
  assert.equal((await api(c, "GET", path)).own_stats.badge, "none");
  assert.equal(detail.stats.state, "expired");
  assert.ok(!("badge" in detail.stats));
  db(
    `begin; set local session_replication_role=replica; delete from public.shared_habit_logs where shared_habit_id='${h.id}' and user_id='${a.id}' and occurred_on <> '${d(0)}'; insert into public.shared_habit_logs(shared_habit_id,user_id,occurred_on) values ('${h.id}','${a.id}','${d(0)}'),('${h.id}','${a.id}','${d(0)}'),('${h.id}','${a.id}','${d(0)}'); commit;`,
  );
  detail = await api(a, "GET", path);
  assert.equal(detail.own_stats.badge, "silver");
  assert.equal(detail.own_stats.final_consistency, 0.25);
  assert.ok(Math.abs(detail.stats.overall_progress - 2 / 3) < 1e-10);
  console.log(
    "PASS: all badge levels, distinct member results, late pre-start join and active result",
  );
  await api(c, "DELETE", `${path}/members/me`, 204);
  await api(c, "GET", path, 404);
  detail = await api(a, "GET", path);
  assert.equal(detail.members.length, 2);
  assert.equal(detail.stats.overall_progress, 0.875);
  assert.equal(
    Number(
      db(
        `select count(*) from public.shared_habit_logs where shared_habit_id='${h.id}' and user_id='${c.id}'`,
      ),
    ),
    1,
  );
  console.log(
    "PASS: departed member loses access, group membership updates, logs retained",
  );
  const active = await create("341 active");
  setLocalFixtureDates(active.id, date(0), date(-1));
  const log = await api(a, "POST", `/shared-habits/${active.id}/logs`, 201);
  assert.equal(log.own_stats.current_period.count, 1);
  const after = await api(
    a,
    "DELETE",
    `/shared-habits/${active.id}/logs/${log.log.id}`,
  );
  assert.equal(after.own_stats.current_period.count, 0);
  assert.equal(
    (await api(a, "GET", `/shared-habits/${active.id}`)).own_stats.badge,
    null,
  );
  const list = (status, extra = "") =>
    api(a, "GET", `/shared-habits?status=${status}${extra}`);
  const both = await list("both");
  const finished = await list("finished");
  const activeList = await list("active");
  assert.equal(both.total, 2);
  assert.equal(finished.total, 1);
  assert.equal(activeList.total, 1);
  assert.equal(finished.habits[0].id, h.id);
  assert.equal(finished.habits[0].own_stats.badge, "silver");
  assert.equal(activeList.habits[0].id, active.id);
  assert.equal(
    (await list("both", "&limit=1&offset=1")).habits[0].id,
    active.id,
  );
  assert.equal((await list("finished", "&limit=1&offset=1")).habits.length, 0);
  console.log(
    "PASS: add/delete activity and status filters, pagination and totals",
  );
  const zones = ["Pacific/Kiritimati", "Pacific/Pago_Pago"];
  const localDates = zones.map((zone) =>
    DateTime.now().setZone(zone).toISODate(),
  );
  if (localDates[0] === localDates[1]) {
    console.log(
      "SKIP: real-time split-date boundary; both extreme timezones currently have the same local date",
    );
  } else {
    const edge = await create("341 timezone boundary");
    await api(b, "POST", `/shared-habits/join/${edge.join_code}`);
    const fast = localDates[0],
      slow = localDates[1];
    const edgeStart = DateTime.fromISO(fast, { zone: "utc" })
      .minus({ days: 4 })
      .toISODate();
    setLocalFixtureDates(
      edge.id,
      edgeStart,
      DateTime.fromISO(edgeStart, { zone: "utc" })
        .minus({ days: 1 })
        .toISODate(),
    );
    db(
      `begin; set local session_replication_role=replica; update public.shared_habit_members set timezone=case when user_id='${a.id}' then '${zones[0]}' else '${zones[1]}' end where shared_habit_id='${edge.id}'; commit;`,
    );
    const fastView = await api(a, "GET", `/shared-habits/${edge.id}`);
    const slowView = await api(b, "GET", `/shared-habits/${edge.id}`);
    assert.equal(fastView.own_today, fast);
    assert.equal(slowView.own_today, slow);
    assert.equal(fastView.own_stats.badge, "none");
    assert.equal(slowView.own_stats.badge, null);
    assert.equal(fastView.stats.state, "active");
    assert.ok((await list("active")).habits.some((x) => x.id === edge.id));
    assert.ok(!(await list("finished")).habits.some((x) => x.id === edge.id));
    console.log(
      "PASS: split-timezone individual and group completion boundary",
    );
  }
} finally {
  for (const id of habits.reverse())
    if (users[0]) await api(users[0], "DELETE", `/shared-habits/${id}`, 204);
  for (const u of users.reverse()) await api(u, "DELETE", "/me", 204);
}
