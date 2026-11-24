import type { ApiBadge, BadgeBook, BadgeChapter } from "@/lib/badges"

/*
 * SAMPLE DATA in the shape GET /me/badges returns, for the style guide and
 * tests. The real page reads the API. Names and rules match the backend
 * catalog (backend/src/domain/achievements/catalog.ts), but only part of it.
 */

type Row = [id: string, name: string, description: string, tier: ApiBadge["tier"]]
type Status = { earned?: string; progress?: [count: number, target: number] }

function badge([id, name, description, tier]: Row, status: Status = {}, secret = false): ApiBadge {
  if (status.earned) {
    return { id, name, description, tier, secret, state: "earned", progress: { count: 1, target: 1 }, earned_at: status.earned }
  }
  if (status.progress) {
    const [count, target] = status.progress
    return { id, name, description, tier, secret, state: "in_progress", progress: { count, target }, earned_at: null }
  }
  return { id, name, description, tier, secret, state: "locked", progress: { count: 0, target: 1 }, earned_at: null }
}

function chapter(id: string, title: string, rows: Row[], status: Record<string, Status> = {}): BadgeChapter {
  return { id, title, badges: rows.map((row) => badge(row, status[row[0]])) }
}

// Noon UTC, so the date reads the same in every US timezone.
const on = (day: string) => `2026-11-${day}T20:00:00Z`

const chapters: BadgeChapter[] = [
  chapter("getting-started", "Getting started", [
    ["seed-money", "Seed Money", "Create your first habit.", "bronze"],
    ["first-drop", "First Drop of Water", "Log your first activity.", "bronze"],
    ["green-thumb", "Green Thumb", "Reach plant stage 2 on any habit.", "bronze"],
    ["sapling-season", "Sapling Season", "Reach plant stage 3 on any habit.", "bronze"],
    ["full-bloom", "Full Bloom", "Reach plant stage 4 on any habit.", "bronze"],
    ["backdated", "Backdated", "Log an activity for an earlier day in the current period.", "bronze"],
    ["personal-touch", "Personal Touch", "Set your display name.", "bronze"],
    ["roots-down", "Roots Down", "Have 3 active habits at once.", "bronze"],
  ], {
    "seed-money": { earned: on("12") }, "first-drop": { earned: on("12") }, "green-thumb": { earned: on("14") },
    "full-bloom": { earned: on("19") }, "personal-touch": { earned: on("12") }, "roots-down": { progress: [2, 3] },
  }),
  chapter("logging", "Logging milestones", [
    ["ten-taps", "Ten Taps", "Log 10 activities in total.", "bronze"],
    ["fifty-strong", "Fifty Strong", "Log 50 activities in total.", "bronze"],
    ["century-club", "Century Club", "Log 100 activities in total.", "silver"],
    ["five-hundred", "Five Hundred Fold", "Log 500 activities in total.", "gold"],
    ["thousand-petal", "Thousand-Petal Rose", "Log 1,000 activities in total.", "platinum"],
    ["overachiever", "Overachiever", "Log more than the target in a single period (for example 6/3).", "bronze"],
  ], {
    "ten-taps": { progress: [7, 10] }, "fifty-strong": { progress: [7, 50] }, "century-club": { progress: [7, 100] },
    overachiever: { earned: on("17") },
  }),
  chapter("streaks", "Streaks", [
    ["two-in-a-row", "Two in a Row", "Reach a streak of 2.", "bronze"],
    ["habit-forming", "Habit Forming", "Reach a streak of 4.", "bronze"],
    ["eight-is-great", "Eight Is Great", "Reach a streak of 8.", "silver"],
  ], { "two-in-a-row": { earned: on("16") }, "habit-forming": { progress: [2, 4] } }),
  chapter("challenges", "Hard challenges", [
    ["iron-routine", "Iron Routine", "Finish 3 habits at 100% consistency.", "gold"],
    ["perfect-year", "Perfect Year", "Log something on at least one habit every day for 365 days.", "platinum"],
  ]),
  {
    id: "secret", title: "Secret badges",
    badges: [
      badge(["early-bird", "Early Bird", "Log an activity before 6 AM, your local time.", "bronze"], { earned: on("18") }, true),
      badge(["night-owl", "Night Owl", "Log an activity between midnight and 4 AM.", "bronze"], { earned: on("20") }, true),
    ],
  },
]

const all = chapters.flatMap((item) => item.badges)

export const sampleBadgeBook: BadgeBook = {
  earned_count: all.filter((item) => item.state === "earned").length,
  visible_count: all.length,
  chapters,
  unseen: [],
}

/** A new user: every badge locked, and no Secret chapter. */
export const emptyBadgeBook: BadgeBook = {
  earned_count: 0,
  visible_count: all.filter((item) => !item.secret).length,
  chapters: chapters.filter((item) => item.id !== "secret").map((item) => ({
    ...item,
    badges: item.badges.map((entry) => ({ ...entry, state: "locked" as const, progress: { count: 0, target: 1 }, earned_at: null })),
  })),
  unseen: [],
}
