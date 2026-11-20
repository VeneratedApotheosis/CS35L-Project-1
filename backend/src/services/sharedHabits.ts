import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInZone } from "../domain/dates.js";
import { isLogDeletable, logDateProblem } from "../domain/logging.js";
import { endDate } from "../domain/periods.js";
import { plantHealth } from "../domain/growth.js";
import {
  currentPeriodProgress,
  overallProgress,
  currentStreak,
} from "../domain/progress.js";
import { sharedHabitStats, isSharedLogDate } from "../domain/sharedHabits.js";
import { fullStats, shortStats, type LogEntry } from "../domain/stats.js";
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

// Both RPC counts and own logs use stable ordering supplied by the caller.
async function* readPages<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: unknown }>,
) {
  for (let offset = 0; ; offset += BATCH) {
    const { data, error } = await query(offset, offset + BATCH - 1);
    if (error) databaseFailure(error);
    const rows = (data ?? []) as T[];
    yield rows;
    if (rows.length < BATCH) break;
  }
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

async function getMembers(
  client: SupabaseClient,
  habit: SharedHabit,
  userId: string,
): Promise<Member[]> {
  const { data, error } = await client.rpc("shared_habit_members_info", {
    p_shared_habit_id: habit.id,
  });
  if (error) databaseFailure(error);
  const members = (data ?? []) as Member[];
  if (!members.some((member) => member.user_id === userId))
    throw notFound("Shared habit not found");
  return members;
}

async function memberData(
  client: SupabaseClient,
  habit: SharedHabit,
  userId: string,
) {
  const members = await getMembers(client, habit, userId);
  const dates = new Map(
    members.map((member) => [member.user_id, [] as string[]]),
  );
  for await (const rows of readPages<DailyCount>((from, to) =>
    client
      .rpc("shared_habit_member_logs", { p_shared_habit_id: habit.id })
      .order("user_id")
      .order("occurred_on")
      .range(from, to),
  )) {
    for (const row of rows) {
      if (!isSharedLogDate(habit, row.occurred_on)) continue;
      const memberDates = dates.get(row.user_id);
      // [PLACEHOLDER] Deliberately expand counts to reuse tested domain rules.
      // Memory/CPU grows with total logs, not daily rows. A count-aware domain
      // API can remove this cost later without truncating valid activity.
      if (memberDates)
        for (let i = 0; i < row.count; i++) memberDates.push(row.occurred_on);
    }
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
  const habits: (SharedHabit & { stats: ReturnType<typeof groupStats> })[] = [];
  const rows = (data ?? []) as SharedHabit[];
  // [PLACEHOLDER] Still two RPCs per habit plus paging. Bound concurrency to
  // four habits instead of serial calls or up to 100 simultaneous RPC chains.
  for (let offset = 0; offset < rows.length; offset += 4) {
    const batch = await Promise.all(
      rows.slice(offset, offset + 4).map(async (habit) => {
        try {
          const members = await memberData(client, habit, userId);
          return { ...habit, stats: groupStats(habit, members, now) };
        } catch (error) {
          // Membership can disappear after the initial RLS-filtered list query.
          // Do not expose that habit or discard the other accessible results.
          if (error instanceof AppError && error.status === 404) return null;
          throw error;
        }
      }),
    );
    for (const habit of batch) if (habit) habits.push(habit);
  }
  // total is the initial query snapshot; a concurrent departure may shorten
  // this page. Keep offset semantics rather than pretending the count is fresh.
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
  const memberInfo = await memberData(client, habit, userId);
  const now = new Date();
  const caller = memberInfo.members.find(
    (member) => member.user_id === userId,
  )!;
  const ownLogs: LogEntry[] = [];
  for await (const rows of readPages<LogEntry>((from, to) =>
    client
      .from("shared_habit_logs")
      .select("id, occurred_on")
      .eq("shared_habit_id", id)
      .eq("user_id", userId)
      .order("occurred_on")
      .order("id")
      .range(from, to),
  )) {
    ownLogs.push(
      ...rows.filter((log) => isSharedLogDate(habit, log.occurred_on)),
    );
  }
  return {
    ...habit,
    stats: groupStats(habit, memberInfo, now),
    members: memberInfo.members.map((member) => {
      const dates = memberInfo.dates.get(member.user_id) ?? [];
      const today = todayInZone(member.timezone, now);
      // Calculate only public summary values; no synthetic log ids/calendar.
      return {
        user_id: member.user_id,
        display_name: member.display_name,
        avatar_url: member.avatar_url,
        is_owner: member.is_owner,
        overall_progress: overallProgress(habit, dates, today),
        current_period_count: currentPeriodProgress(habit, dates, today).count,
        streak: currentStreak(habit, dates, today),
        health: plantHealth(habit, dates, today),
      };
    }),
    own_stats: fullStats(habit, ownLogs, todayInZone(caller.timezone, now)),
  };
}

async function loggingContext(
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
  const members = await getMembers(client, habit, userId);
  const caller = members.find((member) => member.user_id === userId)!;
  return { habit, today: todayInZone(caller.timezone) };
}

async function loggingStats(
  client: SupabaseClient,
  userId: string,
  habit: SharedHabit,
) {
  const now = new Date();
  const data = await memberData(client, habit, userId);
  const caller = data.members.find((member) => member.user_id === userId)!;
  return {
    stats: groupStats(habit, data, now),
    own_stats: shortStats(
      habit,
      data.dates.get(userId)!,
      todayInZone(caller.timezone, now),
    ),
  };
}

export async function addSharedLog(
  client: SupabaseClient,
  userId: string,
  id: string,
  occurredOn?: string,
) {
  const { habit, today } = await loggingContext(client, userId, id);
  const date = occurredOn ?? today;
  if (date < habit.start_date || today < habit.start_date)
    throw validationFailed(
      "occurred_on: shared habits cannot be logged before the start date",
    );
  const problem = logDateProblem(habit, date, today);
  if (problem) throw validationFailed(problem);
  const { data, error } = await client
    .from("shared_habit_logs")
    .insert({ shared_habit_id: id, user_id: userId, occurred_on: date })
    .select("id, shared_habit_id, user_id, occurred_on")
    .single();
  if (error || !data) databaseFailure(error);
  return { log: data, ...(await loggingStats(client, userId, habit)) };
}

export async function deleteSharedLog(
  client: SupabaseClient,
  userId: string,
  id: string,
  logId: string,
) {
  const { habit, today } = await loggingContext(client, userId, id);
  const { data, error } = await client
    .from("shared_habit_logs")
    .select("id, occurred_on")
    .eq("id", logId)
    .eq("shared_habit_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) databaseFailure(error);
  if (!data) throw notFound("Log not found");
  if (
    data.occurred_on < habit.start_date ||
    !isLogDeletable(habit, data.occurred_on, today)
  )
    throw validationFailed(
      "Only logs in the current period can be deleted, earlier periods are locked",
    );
  const { data: deleted, error: deleteError } = await client
    .from("shared_habit_logs")
    .delete()
    .eq("id", logId)
    .eq("shared_habit_id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (deleteError) databaseFailure(deleteError);
  if (!deleted) throw notFound("Log not found");
  return loggingStats(client, userId, habit);
}
