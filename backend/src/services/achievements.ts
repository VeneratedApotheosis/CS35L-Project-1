import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInZone } from "../domain/dates.js";
import { BADGES, CHAPTERS } from "../domain/achievements/catalog.js";
import { evaluateBadges } from "../domain/achievements/engine.js";
import type { Badge } from "../domain/achievements/facts.js";
import type {
  BadgeHabit,
  BadgeLog,
  BadgeTier,
  ChapterId,
  Progress,
} from "../domain/achievements/types.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { fetchLogColumns } from "./logs.js";
import { getProfile } from "./profile.js";

// Achievement badges: load one user's data, run the rules in
// domain/achievements, store new badges and shape the answer. See
// docs/badges-plan.md. Shared habits do not count (self-earned only).

export type BadgeState = "earned" | "in_progress" | "locked";

export type BadgeView = {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  secret: boolean;
  state: BadgeState;
  // Capped at the target. Null for a badge whose rule is not built yet.
  progress: Progress | null;
  earned_at: string | null;
};

export type BadgeBook = {
  earned_count: number;
  // Badges shown in the book. Secret badges count only once earned, so this
  // never gives away how many exist.
  visible_count: number;
  chapters: { id: ChapterId; title: string; badges: BadgeView[] }[];
  // Earned badges whose "Badge earned" moment has not been shown yet.
  unseen: string[];
};

type EarnedRow = {
  badge_id: string;
  earned_at: string;
  seen_at: string | null;
};

type BadgeLogRow = BadgeLog & { habit_id: string };

const HABIT_COLUMNS =
  "id, plant_type, target_count, interval_count, interval_unit, num_periods, start_date, created_at";
const BADGE_LOG_COLUMNS = "habit_id, occurred_on, created_at";
const EARNED_COLUMNS = "badge_id, earned_at, seen_at";

function failed(message: string, err: unknown, userId: string): AppError {
  logger.error({ err, userId }, message.toLowerCase());
  return new AppError(500, "internal_error", message);
}

// Every personal habit the user owns, with every log.
async function loadHabits(
  supabase: SupabaseClient,
  userId: string,
): Promise<BadgeHabit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw failed("Could not load habits", error, userId);

  const habits = (data ?? []) as Omit<BadgeHabit, "logs">[];
  const logs = await fetchLogColumns<BadgeLogRow>(
    supabase,
    habits.map((habit) => habit.id),
    BADGE_LOG_COLUMNS,
  );
  return habits.map((habit) => ({
    ...habit,
    logs: (logs.get(habit.id) ?? []).map(({ occurred_on, created_at }) => ({
      occurred_on,
      created_at,
    })),
  }));
}

async function loadEarned(
  supabase: SupabaseClient,
  userId: string,
): Promise<EarnedRow[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select(EARNED_COLUMNS)
    .eq("user_id", userId);
  if (error) throw failed("Could not load badges", error, userId);
  return (data ?? []) as EarnedRow[];
}

// Inserts the ids and returns only the rows that were new. Another request
// may have stored some of them a moment ago, and those are not returned.
async function award(
  supabase: SupabaseClient,
  userId: string,
  ids: readonly string[],
): Promise<EarnedRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.rpc("award_badges", {
    p_badge_ids: ids,
  });
  if (error) throw failed("Could not save badges", error, userId);
  return ((data ?? []) as EarnedRow[]).map(
    ({ badge_id, earned_at, seen_at }) => ({ badge_id, earned_at, seen_at }),
  );
}

type CheckResult = {
  progress: Map<string, Progress>;
  // Every earned badge in the catalog, with its stored row.
  rows: Map<string, EarnedRow>;
  // Rows this check inserted.
  added: EarnedRow[];
};

// Runs every rule for the user and stores any new badges.
export async function checkBadges(
  supabase: SupabaseClient,
  userId: string,
  options: { displayNameSet?: boolean } = {},
): Promise<CheckResult> {
  const [profile, habits, earnedRows] = await Promise.all([
    getProfile(supabase, userId),
    loadHabits(supabase, userId),
    loadEarned(supabase, userId),
  ]);

  const check = evaluateBadges({
    today: todayInZone(profile.timezone),
    timezone: profile.timezone,
    habits,
    displayNameSet: options.displayNameSet,
    earned: new Set(earnedRows.map((row) => row.badge_id)),
  });
  const added = await award(supabase, userId, check.newlyEarned);

  const rows = new Map(earnedRows.map((row) => [row.badge_id, row]));
  for (const row of added) rows.set(row.badge_id, row);
  // Stored by another request at the same time, so this one did not get the
  // row back. It is earned all the same.
  const now = new Date().toISOString();
  for (const id of check.newlyEarned) {
    if (!rows.has(id))
      rows.set(id, { badge_id: id, earned_at: now, seen_at: now });
  }
  return { progress: check.progress, rows, added };
}

function view(
  badge: Badge,
  progress: Progress | undefined,
  row: EarnedRow | undefined,
): BadgeView {
  const capped =
    progress === undefined
      ? null
      : {
          count: Math.min(progress.count, progress.target),
          target: progress.target,
        };
  let state: BadgeState = "locked";
  if (row) state = "earned";
  else if (capped && capped.target > 1 && capped.count > 0) {
    state = "in_progress";
  }
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    tier: badge.tier,
    secret: badge.secret,
    state,
    progress:
      row && capped ? { count: capped.target, target: capped.target } : capped,
    earned_at: row?.earned_at ?? null,
  };
}

function views(rows: readonly EarnedRow[]): BadgeView[] {
  const byId = new Map(rows.map((row) => [row.badge_id, row]));
  return BADGES.filter((badge) => byId.has(badge.id)).map((badge) =>
    view(badge, undefined, byId.get(badge.id)),
  );
}

// The whole book for the Badges page. Runs a check first, so badges earned by
// time passing (a habit expiring) are stored before the page shows them.
export async function getBadgeBook(
  supabase: SupabaseClient,
  userId: string,
): Promise<BadgeBook> {
  const { progress, rows } = await checkBadges(supabase, userId);

  const chapters = CHAPTERS.map(({ id, title }) => ({
    id,
    title,
    badges: BADGES.filter(
      (badge) => badge.chapter === id && (!badge.secret || rows.has(badge.id)),
    ).map((badge) => view(badge, progress.get(badge.id), rows.get(badge.id))),
  })).filter((chapter) => chapter.badges.length > 0);

  const shown = chapters.flatMap((chapter) => chapter.badges);
  return {
    earned_count: shown.filter((badge) => badge.state === "earned").length,
    visible_count: shown.length,
    chapters,
    unseen: BADGES.filter((badge) => {
      const row = rows.get(badge.id);
      return row !== undefined && row.seen_at === null;
    }).map((badge) => badge.id),
  };
}

// Earned badges the app has not shown yet, for the check on app load.
export async function getUnseenBadges(
  supabase: SupabaseClient,
  userId: string,
): Promise<BadgeView[]> {
  const { rows } = await checkBadges(supabase, userId);
  return views([...rows.values()].filter((row) => row.seen_at === null));
}

// For the write endpoints (log, create habit, profile): the badges this
// request earned. A failed check never fails the write. It is logged, and
// the next check awards anything missed, because the rules read the whole
// history.
export async function awardNewBadges(
  supabase: SupabaseClient,
  userId: string,
  options: { displayNameSet?: boolean } = {},
): Promise<BadgeView[]> {
  try {
    const { added } = await checkBadges(supabase, userId, options);
    return views(added);
  } catch (err) {
    logger.error({ err, userId }, "badge check failed");
    return [];
  }
}

// Records that the "Badge earned" moment was shown. Already seen badges keep
// their first time.
export async function markBadgesSeen(
  supabase: SupabaseClient,
  userId: string,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("user_badges")
    .update({ seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("badge_id", [...ids])
    .is("seen_at", null);
  if (error) throw failed("Could not update badges", error, userId);
}
