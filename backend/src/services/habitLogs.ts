import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInZone } from "../domain/dates.js";
import { isLogDeletable, logDateProblem } from "../domain/logging.js";
import { shortStats, type ShortStats } from "../domain/stats.js";
import { AppError, notFound, validationFailed } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getHabit, type Habit } from "./habits.js";
import { fetchLogs, LOG_COLUMNS, type LogRow } from "./logs.js";
import { getProfile } from "./profile.js";

export type LogResult = { log: LogRow; stats: ShortStats };

// The habit's short stats from its logs as they are in the database now.
async function currentStats(
  supabase: SupabaseClient,
  habit: Habit,
  today: string,
): Promise<ShortStats> {
  const logs = await fetchLogs(supabase, [habit.id]);
  const dates = (logs.get(habit.id) ?? []).map((log) => log.occurred_on);
  return shortStats(habit, dates, today);
}

// Adds a log to the signed-in user's habit. The date defaults to today in the
// profile timezone. The rules are in `logDateProblem`. Another user's habit is
// a 404. Returns the new log and the habit's updated stats, so the app can move
// the bar and grow the plant from one response.
export async function addLog(
  supabase: SupabaseClient,
  userId: string,
  habitId: string,
  occurredOn?: string,
): Promise<LogResult> {
  const habit = await getHabit(supabase, userId, habitId);
  const profile = await getProfile(supabase, userId);
  const today = todayInZone(profile.timezone);
  const date = occurredOn ?? today;

  const problem = logDateProblem(habit, date, today);
  if (problem) throw validationFailed(problem);

  const { data, error } = await supabase
    .from("activity_logs")
    .insert({ habit_id: habit.id, occurred_on: date })
    .select(LOG_COLUMNS)
    .single();

  if (error || !data) {
    logger.error({ err: error, userId, habitId }, "could not add log");
    throw new AppError(500, "internal_error", "Could not add log");
  }
  return {
    log: data as LogRow,
    stats: await currentStats(supabase, habit, today),
  };
}

// Deletes a log from the signed-in user's habit, and returns the habit's
// updated stats. Only logs in the current period can be deleted, because
// earlier periods are locked. A log that is missing, or belongs to another
// habit or user, is a 404.
export async function deleteLog(
  supabase: SupabaseClient,
  userId: string,
  habitId: string,
  logId: string,
): Promise<{ stats: ShortStats }> {
  const habit = await getHabit(supabase, userId, habitId);
  const profile = await getProfile(supabase, userId);
  const today = todayInZone(profile.timezone);

  const { data, error } = await supabase
    .from("activity_logs")
    .select(LOG_COLUMNS)
    .eq("id", logId)
    .eq("habit_id", habit.id)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, userId, habitId, logId }, "could not load log");
    throw new AppError(500, "internal_error", "Could not load log");
  }
  if (!data) throw notFound("Log not found");

  const log = data as LogRow;
  if (!isLogDeletable(habit, log.occurred_on, today)) {
    throw validationFailed(
      "Only logs in the current period can be deleted, earlier periods are locked",
    );
  }

  const { error: deleteError } = await supabase
    .from("activity_logs")
    .delete()
    .eq("id", log.id)
    .eq("habit_id", habit.id);

  if (deleteError) {
    logger.error(
      { err: deleteError, userId, habitId, logId },
      "could not delete log",
    );
    throw new AppError(500, "internal_error", "Could not delete log");
  }
  return { stats: await currentStats(supabase, habit, today) };
}
