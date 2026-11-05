import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, notFound, validationFailed } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string | null;
};

export type ProfilePatch = {
  display_name?: string;
  timezone?: string | null;
};

const PROFILE_COLUMNS = "id, display_name, avatar_url, timezone";

// Row level security limits this to the signed-in user's own row.
export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw notFound("Profile not found");
  }
  if (error) {
    logger.error({ err: error, userId }, "could not load profile");
    throw new AppError(500, "internal_error", "Could not load profile");
  }
  return data as Profile;
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: ProfilePatch,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  // The database trigger rejects timezone names that are not IANA names.
  if (error?.message.startsWith("Invalid timezone")) {
    throw validationFailed("timezone: not a valid IANA timezone");
  }
  if (error?.code === "PGRST116" || (!error && !data)) {
    throw notFound("Profile not found");
  }
  if (error) {
    logger.error({ err: error, userId }, "could not update profile");
    throw new AppError(500, "internal_error", "Could not update profile");
  }
  return data as Profile;
}
