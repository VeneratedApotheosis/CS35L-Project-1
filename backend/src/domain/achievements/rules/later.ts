import type { Badge } from "../facts.js";

// Sections 6 and 8 of docs/badges-ideas.md. Listed so the book shows them, but
// their rules are not built yet (docs/badges-plan.md, step 6). A badge with no
// `evaluate` shows as locked and is never awarded.

function unbuilt(
  chapter: Badge["chapter"],
  id: string,
  name: string,
  description: string,
  tier: Badge["tier"],
): Badge {
  return { chapter, id, name, description, tier, secret: false };
}

export const comebackBadges: Badge[] = [
  unbuilt(
    "comebacks",
    "wilted-not-dead",
    "Wilted but Not Dead",
    "Have a plant reach Wilted health and recover to Healthy.",
    "bronze",
  ),
  unbuilt(
    "comebacks",
    "second-wind",
    "Second Wind",
    "Meet your goal the period right after missing one.",
    "bronze",
  ),
  unbuilt(
    "comebacks",
    "phoenix-plant",
    "Phoenix Plant",
    "Recover a Wilted plant to Healthy and finish the habit with a Silver or Gold.",
    "silver",
  ),
  unbuilt(
    "comebacks",
    "bounce-back",
    "Bounce Back",
    "Meet a goal 3 periods in a row right after a miss.",
    "silver",
  ),
  unbuilt(
    "comebacks",
    "welcome-back",
    "Welcome Back",
    "Log an activity after 14 or more days with no logs at all.",
    "silver",
  ),
  unbuilt(
    "comebacks",
    "clutch",
    "Clutch",
    "Meet a period's target on the last day of that period.",
    "bronze",
  ),
  unbuilt(
    "comebacks",
    "down-to-the-wire",
    "Down to the Wire",
    "Meet the final period's target on the habit's last day to reach 100%.",
    "silver",
  ),
  unbuilt(
    "comebacks",
    "resurrection",
    "Resurrection",
    "Reach Gold on a habit that was Wilted at some point.",
    "gold",
  ),
];

export const challengeBadges: Badge[] = [
  unbuilt(
    "challenges",
    "iron-routine",
    "Iron Routine",
    "Finish 3 habits at 100% consistency.",
    "gold",
  ),
  unbuilt(
    "challenges",
    "perfect-year",
    "Perfect Year",
    "Log something on at least one habit every day for 365 days.",
    "platinum",
  ),
  unbuilt(
    "challenges",
    "hundred-days",
    "The Hundred Days",
    "Log something every day for 100 days.",
    "gold",
  ),
  unbuilt(
    "challenges",
    "quit-quitting",
    "Quit Quitting",
    "Finish 5 habits that each ran at least 8 periods.",
    "gold",
  ),
  unbuilt(
    "challenges",
    "everything-everywhere",
    "Everything Everywhere",
    "Keep 5 active habits all Healthy for 8 weeks.",
    "gold",
  ),
  unbuilt(
    "challenges",
    "grandmaster",
    "Grandmaster Gardener",
    "Earn Gold on 25 habits.",
    "platinum",
  ),
  unbuilt(
    "challenges",
    "four-seasons",
    "Four Seasons",
    "Finish a habit in each of the four seasons of a year.",
    "gold",
  ),
  unbuilt(
    "challenges",
    "year-in-bloom",
    "Year in Bloom",
    "Finish a habit that ran a full year (by months or weeks).",
    "gold",
  ),
  unbuilt(
    "challenges",
    "untouchable",
    "Untouchable",
    "Go a full year with no Wilted plants.",
    "platinum",
  ),
  unbuilt(
    "challenges",
    "triple-crown",
    "Triple Crown",
    "Earn a Gold on a daily, a weekly and a monthly habit.",
    "gold",
  ),
];
