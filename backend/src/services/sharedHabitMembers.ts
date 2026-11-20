import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, notFound, validationFailed } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

function fail(error: unknown): never {
  logger.error({ err: error }, "shared habit membership query failed");
  throw new AppError(500, "internal_error", "Could not update membership");
}

export async function removeSharedMember(
  client: SupabaseClient,
  userId: string,
  habitId: string,
  targetId: string,
  leaving: boolean,
) {
  const { error } = await client.rpc("delete_shared_habit_member", {
    p_shared_habit_id: habitId,
    p_user_id: leaving ? userId : targetId,
    p_leave: leaving,
  });
  if (!error) return;
  if (error.message === "shared_habit_not_found")
    throw notFound("Shared habit not found");
  if (error.message === "shared_habit_member_not_found")
    throw notFound("Member not found");
  if (error.message === "shared_habit_not_owner")
    throw new AppError(403, "forbidden", "Only the owner can remove members");
  if (error.message === "shared_habit_owner_cannot_leave")
    throw validationFailed("Transfer ownership before leaving");
  if (error.message === "shared_habit_invalid_request")
    throw validationFailed("Invalid membership request");
  fail(error);
}

export async function transferSharedHabit(
  client: SupabaseClient,
  habitId: string,
  newOwner: string,
) {
  const { error } = await client.rpc("transfer_shared_habit_ownership", {
    p_shared_habit_id: habitId,
    p_new_owner: newOwner,
  });
  if (!error) return;
  if (error.message === "shared_habit_not_found")
    throw notFound("Shared habit not found");
  if (error.message === "shared_habit_not_owner")
    throw new AppError(
      403,
      "forbidden",
      "Only the owner can transfer ownership",
    );
  if (error.message === "shared_habit_not_member")
    throw validationFailed("New owner must be a member");
  fail(error);
}
