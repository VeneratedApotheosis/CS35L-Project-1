import { todayInZone } from "./dates.js";
import { growthStage, healthFromRate, healthRate } from "./growth.js";
import { habitState } from "./periods.js";
import { overallProgress, type ProgressHabit } from "./progress.js";

/** Only current members belong here. The service loads membership and logs. */
export type SharedMember = {
  /** The timezone snapshot stored on membership, not the live profile timezone. */
  timezone: string | null;
  logDates: readonly string[];
};

/** Shared habits require a finite goal, as specified by the create rules. */
export type SharedGoal = ProgressHabit & { num_periods: number };

/** Shared logs cannot belong to a day before the shared goal starts. */
export function isSharedLogDate(
  habit: Pick<SharedGoal, "start_date">,
  date: string,
): boolean {
  return date >= habit.start_date;
}

/**
 * Rule 8.11. Passing the instant explicitly keeps this calculation deterministic.
 * No membership dates change the shared goal: every member has the same target.
 * Results contain aggregate numbers only, never another member's log dates.
 */
export function sharedHabitStats(
  habit: SharedGoal,
  members: readonly SharedMember[],
  now: Date,
) {
  // A shared habit must have its owner as a member. Fail rather than divide by
  // zero or invent a group timezone when the service supplies an empty group.
  if (members.length === 0) {
    throw new RangeError(
      "Shared habit stats require at least one current member",
    );
  }
  if (!Number.isInteger(habit.num_periods) || habit.num_periods < 1) {
    throw new RangeError("Shared habits require a positive number of periods");
  }

  const today = members
    .map((member) => todayInZone(member.timezone, now))
    .reduce((earliest, date) => (date < earliest ? date : earliest));

  let progressTotal = 0;
  let healthTotal = 0;
  for (const member of members) {
    // Unlike personal habits, shared habits cannot be logged before the start
    const dates = member.logDates.filter((date) =>
      isSharedLogDate(habit, date),
    );
    // Each member is capped BEFORE averaging, so extra activity cannot compensate for another member who never logs
    progressTotal += overallProgress(habit, dates, today)!;
    healthTotal += healthRate(habit, dates, today);
  }
  const progress = progressTotal / members.length;
  const health = healthTotal / members.length;
  return {
    today,
    state: habitState(habit, today),
    overall_progress: progress,
    stage: growthStage(progress),
    health_rate: health,
    health: healthFromRate(health),
  };
}
