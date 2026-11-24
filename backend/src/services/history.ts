import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadgeLevel } from "../domain/badges.js";
import { todayInZone } from "../domain/dates.js";
import {
  buildHistory,
  type HistoryHabit,
  type HistorySort,
  type HistorySourceHabit,
  type HistorySummary,
} from "../domain/history.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { Pagination } from "../lib/pagination.js";
import { fetchLogs } from "./logs.js";
import { getProfile } from "./profile.js";

const HISTORY_COLUMNS =
  "id, name, description, plant_type, target_count, interval_count, interval_unit, num_periods, start_date";

export type HistoryPage = {
  summary: HistorySummary;
  habits: HistoryHabit[];
  // Finished habits that match the filter, before paging.
  total: number;
  limit: number;
  offset: number;
};

// The History tab: the signed-in user's finished personal habits with their
// final numbers, and a summary across all of them. Like the Dashboard, it
// reads every habit and log, because the level filter, the sort and the
// summary all need each habit's result before a page can be cut. Shared
// habits are not included yet (#342).
export async function getHistory(
  supabase: SupabaseClient,
  userId: string,
  query: Pagination & { level?: BadgeLevel; sort?: HistorySort },
): Promise<HistoryPage> {
  const { data, error } = await supabase
    .from("habits")
    .select(HISTORY_COLUMNS)
    .eq("owner_id", userId);
  if (error) {
    logger.error({ err: error, userId }, "could not load history");
    throw new AppError(500, "internal_error", "Could not load your history");
  }
  const habits = (data ?? []) as HistorySourceHabit[];

  const profile = await getProfile(supabase, userId);
  const logs = await fetchLogs(
    supabase,
    habits.map((habit) => habit.id),
  );

  const history = buildHistory(
    habits.map((habit) => ({
      habit,
      logDates: (logs.get(habit.id) ?? []).map((log) => log.occurred_on),
    })),
    todayInZone(profile.timezone),
    { level: query.level, sort: query.sort },
  );

  return {
    summary: history.summary,
    habits: history.habits.slice(query.offset, query.offset + query.limit),
    total: history.habits.length,
    limit: query.limit,
    offset: query.offset,
  };
}
