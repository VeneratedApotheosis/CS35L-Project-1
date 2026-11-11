import { habitState } from "./periods.js";
import {
  consistency,
  overallProgress,
  type ProgressHabit,
} from "./progress.js";

// Completion and badge rules from docs/backend/design.md, section 8.9. Pure,
// like the rest of `domain/`.

export type BadgeLevel = "gold" | "silver" | "bronze" | "none";

export type HabitResult = {
  // A habit expires when its end date passes. Only expired habits have a result.
  expired: boolean;
  // The final progress and consistency, as numbers from 0 to 1.
  progress: number | null;
  consistency: number | null;
  // Null until the habit expires, then the highest level reached.
  badge: BadgeLevel | null;
};

// Gold: all of the target done and consistency of at least 80%. Silver: all of
// the target done. Bronze: at least 60% of it. Otherwise none. With 4 periods,
// 80% consistency means no misses (3 of 4 is 75%).
export function badgeLevel(
  progress: number,
  consistencyRate: number | null,
): BadgeLevel {
  if (progress >= 1 && consistencyRate !== null && consistencyRate >= 0.8) {
    return "gold";
  }
  if (progress >= 1) return "silver";
  if (progress >= 0.6) return "bronze";
  return "none";
}

// The result of a habit as of today. An active or not-yet-started habit has no
// badge, and an expired habit takes no new logs, so its result is final.
export function habitResult(
  habit: ProgressHabit,
  logDates: readonly string[],
  today: string,
): HabitResult {
  const progress = overallProgress(habit, logDates, today);
  const rate = consistency(habit, logDates, today).rate;
  const expired = habitState(habit, today) === "expired";
  return {
    expired,
    progress,
    consistency: rate,
    // An expired habit always has an end, so its progress is never null.
    badge: expired && progress !== null ? badgeLevel(progress, rate) : null,
  };
}
