import type { SupabaseClient } from "@supabase/supabase-js";
import { isBeforeDate, todayInZone } from "../domain/dates.js";
import type { PlantType } from "../domain/plants.js";
import { shortStats, type ShortStats } from "../domain/stats.js";
import { AppError, notFound, validationFailed } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { Page, Pagination } from "../lib/pagination.js";
import { fetchLogs } from "./logs.js";
import { getProfile } from "./profile.js";

export type CreateHabitInput = {
  name: string;
  description?: string;
  plant_type: PlantType;
  target_count: number;
  interval_count: number;
  interval_unit: "day" | "week" | "month";
  num_periods: number;
  start_date?: string;
};

export type Habit = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  plant_type: string;
  target_count: number;
  interval_count: number;
  interval_unit: string;
  num_periods: number | null;
  start_date: string;
  created_at: string;
};

export type HabitWithStats = Habit & { stats: ShortStats };

const HABIT_COLUMNS =
  "id, owner_id, name, description, plant_type, target_count, interval_count, interval_unit, num_periods, start_date, created_at";

// The owner is always the signed-in user. "Today" uses the profile timezone.
export async function createHabit(
  supabase: SupabaseClient,
  userId: string,
  input: CreateHabitInput,
): Promise<Habit> {
  const profile = await getProfile(supabase, userId);
  const today = todayInZone(profile.timezone);
  const startDate = input.start_date ?? today;

  if (isBeforeDate(startDate, today)) {
    throw validationFailed("start_date: must be today or later");
  }

  const { data, error } = await supabase
    .from("habits")
    .insert({
      owner_id: userId,
      name: input.name,
      description: input.description,
      plant_type: input.plant_type,
      target_count: input.target_count,
      interval_count: input.interval_count,
      interval_unit: input.interval_unit,
      num_periods: input.num_periods,
      start_date: startDate,
    })
    .select(HABIT_COLUMNS)
    .single();

  // [PLACEHOLDER] Every insert error becomes a generic 500. Constraint
  // violations are not mapped to a 400 yet.
  if (error || !data) {
    logger.error({ err: error, userId }, "could not create habit");
    throw new AppError(500, "internal_error", "Could not create habit");
  }
  return data as Habit;
}

// Each habit comes with a short `stats` block for the Garden: the current
// period's count, overall progress, growth stage and health. The logs of the
// whole page are read in one query. Newest first is a provisional sort order.
// The owner_id filter is a second layer on top of row level security.
export async function listHabits(
  supabase: SupabaseClient,
  userId: string,
  page: Pagination,
): Promise<Page<HabitWithStats>> {
  const { data, error, count } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS, { count: "exact" })
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);

  if (error) {
    logger.error({ err: error, userId }, "could not list habits");
    throw new AppError(500, "internal_error", "Could not list habits");
  }
  const habits = (data ?? []) as Habit[];

  // Nothing to calculate for an empty page, so skip the profile and log reads.
  let items: HabitWithStats[] = [];
  if (habits.length > 0) {
    const profile = await getProfile(supabase, userId);
    const today = todayInZone(profile.timezone);
    const logs = await fetchLogs(
      supabase,
      habits.map((habit) => habit.id),
    );
    items = habits.map((habit) => ({
      ...habit,
      stats: shortStats(
        habit,
        (logs.get(habit.id) ?? []).map((log) => log.occurred_on),
        today,
      ),
    }));
  }
  return {
    items,
    total: count ?? 0,
    limit: page.limit,
    offset: page.offset,
  };
}

// Another user's habit looks the same as a missing one.
export async function getHabit(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Habit> {
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, userId, habitId: id }, "could not load habit");
    throw new AppError(500, "internal_error", "Could not load habit");
  }
  if (!data) {
    throw notFound("Habit not found");
  }
  return data as Habit;
}
