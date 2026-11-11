import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInZone } from "../domain/dates.js";
import {
  buildDashboard,
  type Dashboard,
  type DashboardHabit,
} from "../domain/dashboard.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { fetchLogs } from "./logs.js";
import { getProfile } from "./profile.js";

const DASHBOARD_COLUMNS =
  "id, name, plant_type, target_count, interval_count, interval_unit, num_periods, start_date";

// The overall view across all of the signed-in user's habits, for the
// Dashboard. All habits are read, with no paging, and all their logs in one
// query (per page). Row level security and the owner_id filter limit both to
// the user's own data.
export async function getDashboard(
  supabase: SupabaseClient,
  userId: string,
): Promise<Dashboard> {
  const { data, error } = await supabase
    .from("habits")
    .select(DASHBOARD_COLUMNS)
    .eq("owner_id", userId);

  if (error) {
    logger.error({ err: error, userId }, "could not load habits");
    throw new AppError(500, "internal_error", "Could not load the dashboard");
  }
  const habits = (data ?? []) as DashboardHabit[];

  const profile = await getProfile(supabase, userId);
  const today = todayInZone(profile.timezone);
  const logs = await fetchLogs(
    supabase,
    habits.map((habit) => habit.id),
  );

  return buildDashboard(
    habits.map((habit) => ({
      habit,
      logDates: (logs.get(habit.id) ?? []).map((log) => log.occurred_on),
    })),
    today,
  );
}
