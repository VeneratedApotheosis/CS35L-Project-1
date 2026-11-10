import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export type LogRow = { id: string; habit_id: string; occurred_on: string };

const LOG_COLUMNS = "id, habit_id, occurred_on";

// Supabase returns at most 1000 rows per request, so logs are read in pages.
const PAGE_SIZE = 1000;

// The logs of the given habits, grouped by habit and oldest first. One query
// (per page) for all habits, not one per habit. Row level security limits the
// result to logs of the signed-in user's habits.
export async function fetchLogs(
  supabase: SupabaseClient,
  habitIds: readonly string[],
): Promise<Map<string, LogRow[]>> {
  const byHabit = new Map<string, LogRow[]>();
  if (habitIds.length === 0) return byHabit;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select(LOG_COLUMNS)
      .in("habit_id", [...habitIds])
      .order("occurred_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      logger.error({ err: error }, "could not load logs");
      throw new AppError(500, "internal_error", "Could not load logs");
    }
    const rows = (data ?? []) as LogRow[];
    for (const row of rows) {
      const list = byHabit.get(row.habit_id) ?? [];
      list.push(row);
      byHabit.set(row.habit_id, list);
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return byHabit;
}
