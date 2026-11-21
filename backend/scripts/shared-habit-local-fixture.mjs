// Test-only fixture support. Never run against a hosted Supabase project.
import { execFileSync } from "node:child_process";

export function requireLocalFixture(supabaseUrl, apiUrl) {
  for (const value of [supabaseUrl, apiUrl]) {
    const url = new URL(value);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
      throw new Error(
        "These fixture tests require local Supabase and API URLs",
      );
    }
  }
}

// Join while the habit starts in the future, then move its dates for the
// logging tests. This privileged, transaction-local trigger bypass is only for
// a disposable local fixture; it does not change production schema or rules.
export function setLocalFixtureDates(habitId, startDate, joinBy) {
  if (!/^[0-9a-f-]{36}$/i.test(habitId)) throw new Error("Invalid fixture id");
  for (const date of [startDate, joinBy]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new Error("Invalid fixture date");
  }
  const container =
    process.env.TEST_DB_CONTAINER ?? "supabase_db_codex-271-local-supabase";
  if (!/^supabase_db_[a-zA-Z0-9_-]+$/.test(container))
    throw new Error("Expected a local Supabase database container");
  const sql = `begin; set local session_replication_role = replica;
update public.shared_habits set start_date = '${startDate}', join_by = '${joinBy}', management_locked = false where id = '${habitId}' returning id;
commit;`;
  const output = execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
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
  );
  if (output.trim() !== habitId)
    throw new Error("Fixture was not found in the isolated local database");
}
