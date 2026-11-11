import { habitResult, type BadgeLevel } from "./badges.js";
import { plantHealth, type PlantHealth } from "./growth.js";
import { endDate, habitState, type HabitState } from "./periods.js";
import {
  averageConsistency,
  consistency,
  currentStreak,
  type ProgressHabit,
} from "./progress.js";

// The overall view for the Dashboard, put together from the rules in
// `domain/`. Pure: the caller loads habits and logs and passes today's date.

export type DashboardHabit = ProgressHabit & {
  id: string;
  name: string;
  plant_type: string;
};

export type DashboardItem = { habit: DashboardHabit; logDates: string[] };

export type ActiveHabit = {
  id: string;
  name: string;
  plant_type: string;
  state: HabitState;
  streak: number;
  // 0 to 1, or null before the habit has finished a period.
  consistency: number | null;
  health: PlantHealth;
};

export type FinishedHabit = {
  id: string;
  name: string;
  plant_type: string;
  end_date: string;
  progress: number | null;
  consistency: number | null;
  // "none" means the habit failed: under 60% of its target.
  badge: BadgeLevel;
};

export type Dashboard = {
  // Habits that have not expired. A habit that has not started counts.
  active_count: number;
  // Rule 8.5: the average of each active habit's consistency, or null when no
  // habit has finished a period.
  overall_consistency: number | null;
  // The active habit with the longest current streak, or null when none has one.
  best_streak: { id: string; name: string; streak: number } | null;
  // Every active habit, longest streak first.
  habits: ActiveHabit[];
  // Active habits whose plant is not healthy: wilted first. Health looks at the
  // last four completed periods and is only healthy at 80% or more, so a missed
  // last period always makes it at least slightly wilted.
  needs_attention: ActiveHabit[];
  // Expired habits with their final result, most recently ended first.
  finished: FinishedHabit[];
};

const HEALTH_ORDER: Record<PlantHealth, number> = {
  wilted: 0,
  slightly_wilted: 1,
  healthy: 2,
};

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

export function buildDashboard(
  items: readonly DashboardItem[],
  today: string,
): Dashboard {
  const active: ActiveHabit[] = [];
  const finished: FinishedHabit[] = [];

  for (const { habit, logDates } of items) {
    const state = habitState(habit, today);
    const base = {
      id: habit.id,
      name: habit.name,
      plant_type: habit.plant_type,
    };

    if (state === "expired") {
      const result = habitResult(habit, logDates, today);
      finished.push({
        ...base,
        // An expired habit always has an end date and a badge.
        end_date: endDate(habit) as string,
        progress: result.progress,
        consistency: result.consistency,
        badge: result.badge as BadgeLevel,
      });
    } else {
      active.push({
        ...base,
        state,
        streak: currentStreak(habit, logDates, today),
        consistency: consistency(habit, logDates, today).rate,
        health: plantHealth(habit, logDates, today),
      });
    }
  }

  active.sort((a, b) => b.streak - a.streak || byName(a, b));
  finished.sort((a, b) =>
    a.end_date < b.end_date ? 1 : a.end_date > b.end_date ? -1 : byName(a, b),
  );

  const needsAttention = active
    .filter((habit) => habit.health !== "healthy")
    .sort(
      (a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || byName(a, b),
    );

  const best = active[0];
  return {
    active_count: active.length,
    overall_consistency: averageConsistency(active.map((h) => h.consistency)),
    best_streak:
      best && best.streak > 0
        ? { id: best.id, name: best.name, streak: best.streak }
        : null,
    habits: active,
    needs_attention: needsAttention,
    finished,
  };
}
