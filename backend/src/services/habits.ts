import type { SupabaseClient } from "@supabase/supabase-js";
import { isBeforeDate, todayInZone } from "../domain/dates.js";
import type { PlantType } from "../domain/plants.js";
import { AppError, validationFailed } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
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
