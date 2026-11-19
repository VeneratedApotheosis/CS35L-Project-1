import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInZone } from "../domain/dates.js";
import { endDate } from "../domain/periods.js";
import { currentPeriodProgress } from "../domain/progress.js";
import { sharedHabitStats } from "../domain/sharedHabits.js";
import { fullStats, type LogEntry } from "../domain/stats.js";
import { AppError, notFound, validationFailed } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { Pagination } from "../lib/pagination.js";
import type { CreateHabitInput, Habit } from "./habits.js";
import { getProfile } from "./profile.js";

export type SharedHabit = Habit & {
  num_periods: number;
  join_by: string;
  max_members: number;
  join_code: string | null;
};
export type CreateSharedInput = CreateHabitInput & {
  join_by: string;
  max_members: number;
};
type Member = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
  timezone: string;
  is_owner: boolean;
};
type DailyCount = { user_id: string; occurred_on: string; count: number };
const COLUMNS =
  "id, owner_id, name, description, plant_type, target_count, interval_count, interval_unit, num_periods, start_date, created_at, join_by, max_members, join_code";
const BATCH = 500;

function databaseFailure(error: unknown): never {
  logger.error({ err: error }, "shared habit query failed");
  throw new AppError(
    500,
    "internal_error",
    "Could not load or save shared habit",
  );
}

export async function createSharedHabit(
  client: SupabaseClient,
  userId: string,
  input: CreateSharedInput,
) {
  const profile = await getProfile(client, userId);
  const today = todayInZone(profile.timezone);
  const start = input.start_date ?? today;
  if (start < today)
    throw validationFailed("start_date: must be today or later");
  if (input.join_by < today || input.join_by > start) {
    throw validationFailed("join_by: must be between today and start_date");
  }
  // The database trigger adds the owner and snapshots their timezone atomically.
  // Never accept owner_id, membership rows, or join_code from the request.
  const { data, error } = await client
    .from("shared_habits")
    .insert({ ...input, start_date: start, owner_id: userId })
    .select(COLUMNS)
    .single();
  if (error || !data) databaseFailure(error);
  return data as SharedHabit;
}

async function memberData(
  client: SupabaseClient,
  habitId: string,
  userId: string,
) {
  const { data, error } = await client.rpc("shared_habit_members_info", {
    p_shared_habit_id: habitId,
  });
  if (error) databaseFailure(error);
  const members = (data ?? []) as Member[];
  if (!members.some((member) => member.user_id === userId))
    throw notFound("Shared habit not found");

  const dates = new Map(
    members.map((member) => [member.user_id, [] as string[]]),
  );
  for (let offset = 0; ; offset += BATCH) {
    const result = await client
      .rpc("shared_habit_member_logs", { p_shared_habit_id: habitId })
      .order("user_id")
      .order("occurred_on")
      .range(offset, offset + BATCH - 1);
    if (result.error) databaseFailure(result.error);
    const rows = (result.data ?? []) as DailyCount[];
    for (const row of rows) {
      const memberDates = dates.get(row.user_id);
      // Reuse the existing log-date calculations; RPC counts represent distinct logs.
      if (memberDates)
        for (let i = 0; i < row.count; i++) memberDates.push(row.occurred_on);
    }
    if (rows.length < BATCH) break;
  }
  return { members, dates };
}

function groupStats(
  habit: SharedHabit,
  data: Awaited<ReturnType<typeof memberData>>,
  now: Date,
) {
  const group = sharedHabitStats(
    habit,
    data.members.map((member) => ({
      timezone: member.timezone,
      logDates: data.dates.get(member.user_id)!,
    })),
    now,
  );
  const periods = data.members.map((member) =>
    currentPeriodProgress(habit, data.dates.get(member.user_id)!, group.today),
  );
  const period = periods[0]!;
  return {
    ...group,
    end_date: endDate(habit),
    current_period: {
      number: period.number,
      total: habit.num_periods,
      start: period.start,
      end: period.end,
      // Average count preserves the shared per-person target.
      count:
        periods.reduce((sum, value) => sum + value.count, 0) / periods.length,
      target: habit.target_count,
    },
  };
}

export async function listSharedHabits(
  client: SupabaseClient,
  userId: string,
  page: Pagination,
) {
  // RLS selects memberships, not just habits owned by the caller.
  const { data, error, count } = await client
    .from("shared_habits")
    .select(COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) databaseFailure(error);
  const now = new Date();
  const habits = [];
  for (const habit of (data ?? []) as SharedHabit[]) {
    const members = await memberData(client, habit.id, userId);
    habits.push({ ...habit, stats: groupStats(habit, members, now) });
  }
  return { habits, total: count ?? 0, limit: page.limit, offset: page.offset };
}

export async function getSharedHabit(
  client: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await client
    .from("shared_habits")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) databaseFailure(error);
  if (!data) throw notFound("Shared habit not found");
  const habit = data as SharedHabit;
  const memberInfo = await memberData(client, id, userId);
  const now = new Date();
  const caller = memberInfo.members.find(
    (member) => member.user_id === userId,
  )!;
  const ownLogs: LogEntry[] = [];
  for (let offset = 0; ; offset += BATCH) {
    const result = await client
      .from("shared_habit_logs")
      .select("id, occurred_on")
      .eq("shared_habit_id", id)
      .eq("user_id", userId)
      .order("occurred_on")
      .order("id")
      .range(offset, offset + BATCH - 1);
    if (result.error) databaseFailure(result.error);
    const rows = (result.data ?? []) as LogEntry[];
    ownLogs.push(...rows);
    if (rows.length < BATCH) break;
  }
  return {
    ...habit,
    stats: groupStats(habit, memberInfo, now),
    members: memberInfo.members.map((member) => {
      const stats = fullStats(
        habit,
        (memberInfo.dates.get(member.user_id) ?? []).map((occurred_on) => ({
          id: "",
          occurred_on,
        })),
        todayInZone(member.timezone, now),
      );
      // Explicit allowlist: do not spread fullStats into another member's summary.
      return {
        user_id: member.user_id,
        display_name: member.display_name,
        avatar_url: member.avatar_url,
        is_owner: member.is_owner,
        overall_progress: stats.overall_progress,
        current_period_count: stats.current_period.count,
        streak: stats.streak,
        health: stats.health,
      };
    }),
    own_stats: fullStats(habit, ownLogs, todayInZone(caller.timezone, now)),
  };
}
