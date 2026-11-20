import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, notFound, validationFailed } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

function fail(error: unknown): never {
  logger.error({ err: error }, "shared habit membership query failed");
  throw new AppError(500, "internal_error", "Could not update membership");
}

async function membershipContext(
  client: SupabaseClient,
  userId: string,
  habitId: string,
) {
  const { data: habit, error } = await client
    .from("shared_habits")
    .select("id, owner_id")
    .eq("id", habitId)
    .maybeSingle();
  if (error) fail(error);
  if (!habit) throw notFound("Shared habit not found");
  const { data: members, error: membersError } = await client.rpc(
    "shared_habit_members_info",
    { p_shared_habit_id: habitId },
  );
  if (membersError) fail(membersError);
  if (
    !(members as { user_id: string }[] | null)?.some(
      (member) => member.user_id === userId,
    )
  )
    throw notFound("Shared habit not found");
  return habit as { id: string; owner_id: string };
}

export async function removeSharedMember(
  client: SupabaseClient,
  userId: string,
  habitId: string,
  targetId: string,
  leaving: boolean,
) {
  const habit = await membershipContext(client, userId, habitId);
  if (leaving && habit.owner_id === userId)
    throw validationFailed("Transfer ownership before leaving");
  if (!leaving && habit.owner_id !== userId)
    throw new AppError(403, "forbidden", "Only the owner can remove members");
  if (!leaving && targetId === userId)
    throw validationFailed("Transfer ownership before leaving");
  const { data, error } = await client
    .from("shared_habit_members")
    .delete()
    .eq("shared_habit_id", habitId)
    .eq("user_id", targetId)
    .select("user_id")
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw notFound("Member not found");
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
