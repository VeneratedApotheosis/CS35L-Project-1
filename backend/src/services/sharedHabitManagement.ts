import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, notFound, validationFailed } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

// The database trigger enforces state and membership checks on the same row
// lock used by join, leave and transfer. Never trust a prior HTTP-level read.
export async function editSharedHabit(
  client: SupabaseClient,
  userId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await client
    .from("shared_habits")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", userId)
    .select(
      "id, owner_id, name, description, plant_type, target_count, interval_count, interval_unit, num_periods, start_date, created_at, join_by, max_members, join_code",
    )
    .maybeSingle();
  if (error) {
    if (
      [
        "shared_habit_started",
        "shared_habit_goal_locked",
        "shared_habit_cap_below_members",
        "shared_habit_invalid_dates",
        "shared_habit_invalid_plant",
      ].includes(error.message) ||
      error.code === "23514"
    )
      throw validationFailed(
        "Shared habit cannot be edited with these values in its current state",
      );
    logger.error({ code: error.code }, "could not edit shared habit");
    throw new AppError(500, "internal_error", "Could not edit shared habit");
  }
  if (!data) throw notFound("Shared habit not found");
  return data;
}

export async function manageSharedCode(
  client: SupabaseClient,
  userId: string,
  id: string,
  regenerate: boolean,
) {
  const code = regenerate ? randomBytes(16).toString("hex") : null;
  const { data, error } = await client
    .from("shared_habits")
    .update({ join_code: code })
    .eq("id", id)
    .eq("owner_id", userId)
    .select("join_code")
    .maybeSingle();
  if (error) {
    if (error.message === "shared_habit_started")
      throw validationFailed(
        "Invite management is unavailable once a member reaches the start date",
      );
    logger.error({ code: error.code }, "could not manage shared habit code");
    throw new AppError(500, "internal_error", "Could not manage invite code");
  }
  if (!data) throw notFound("Shared habit not found");
  return { join_code: data.join_code as string | null };
}

export async function deleteSharedHabit(
  client: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await client
    .from("shared_habits")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    logger.error({ code: error.code }, "could not delete shared habit");
    throw new AppError(500, "internal_error", "Could not delete shared habit");
  }
  if (!data) throw notFound("Shared habit not found");
}
