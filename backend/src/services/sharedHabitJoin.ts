import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInZone } from "../domain/dates.js";
import { AppError, notFound } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { getProfile } from "./profile.js";

type Preview = {
  name: string;
  description: string | null;
  plant_type: string;
  target_count: number;
  interval_count: number;
  interval_unit: string;
  num_periods: number;
  start_date: string;
  join_by: string;
  owner_display_name: string | null;
  member_count: number;
  max_members: number;
};
function logRpcFailure(operation: string, error?: { code?: string }) {
  // SQLSTATE is useful for diagnosis; free-text details may contain invite codes.
  const sqlState =
    error?.code && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : undefined;
  logger.error({ operation, sqlState }, "unexpected invite RPC failure");
}

const unavailable = () => notFound("Invite not available");

export async function previewSharedHabit(
  client: SupabaseClient,
  userId: string,
  code: string,
) {
  const { data, error } = await client.rpc("shared_habit_preview", {
    p_code: code,
  });
  if (error) {
    logRpcFailure("shared_habit_preview", error);
    throw new AppError(500, "internal_error", "Could not load invite");
  }
  const row = (data as Preview[] | null)?.[0];
  if (!row) throw unavailable();
  // The database preview only matches the code; enforce its local-date deadline here.
  const profile = await getProfile(client, userId);
  const today = todayInZone(profile.timezone);
  if (today > row.join_by || today > row.start_date) throw unavailable();
  return {
    ...row,
    places_left: Math.max(0, row.max_members - row.member_count),
  };
}

export async function joinSharedHabit(client: SupabaseClient, code: string) {
  // One locked database operation performs cap/deadline checks and insertion.
  // Do not precheck via preview: existing members can safely join again.
  const { data, error } = await client.rpc("join_shared_habit", {
    p_code: code,
  });
  if (error) {
    if (error.message === "shared_habit_not_found") throw unavailable();
    if (error.message === "shared_habit_full")
      throw new AppError(409, "shared_habit_full", "This shared habit is full");
    if (error.message === "shared_habit_join_ended")
      throw new AppError(400, "shared_habit_join_ended", "Joining has ended");
    logRpcFailure("join_shared_habit", error);
    throw new AppError(500, "internal_error", "Could not join shared habit");
  }
  if (typeof data !== "string") {
    logRpcFailure("join_shared_habit.invalid_response");
    throw new AppError(500, "internal_error", "Could not join shared habit");
  }
  return { id: data };
}
