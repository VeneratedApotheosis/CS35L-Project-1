import { periodSummaries, type ProgressHabit } from "./progress.js";

// Plant growth and health rules from docs/backend/design.md, sections 8.7 and
// 8.8. Pure, like the rest of `domain/`.

export type GrowthStage = 1 | 2 | 3 | 4;
export type PlantHealth = "healthy" | "slightly_wilted" | "wilted";

// How many of the most recent completed periods decide the health.
export const HEALTH_WINDOW = 4;

// Rule 8.7: four stages from overall progress (a number from 0 to 1):
// 0 to 24%, 25 to 49%, 50 to 74% and 75 to 100%. The stage follows progress, so
// a plant can reach stage 4 before the end date. A habit with no total target
// (indefinite) stays at stage 1.
export function growthStage(overall: number | null): GrowthStage {
  if (overall === null || overall < 0.25) return 1;
  if (overall < 0.5) return 2;
  if (overall < 0.75) return 3;
  return 4;
}

// Rule 8.8: the share of met periods among the last four completed ones (fewer
// early on). 80% and up is healthy, 50 to 79% slightly wilted, and below 50%
// wilted. Before the first period ends the plant is healthy, and it recovers as
// later goals are met because old periods drop out of the window.
export function plantHealth(
  habit: ProgressHabit,
  logDates: readonly string[],
  today: string,
): PlantHealth {
  const recent = periodSummaries(habit, logDates, today)
    .filter((period) => period.status === "completed")
    .slice(-HEALTH_WINDOW);
  if (recent.length === 0) return "healthy";

  const rate = recent.filter((period) => period.met).length / recent.length;
  if (rate >= 0.8) return "healthy";
  if (rate >= 0.5) return "slightly_wilted";
  return "wilted";
}
