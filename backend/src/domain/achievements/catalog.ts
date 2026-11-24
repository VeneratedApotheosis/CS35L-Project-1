import type { Badge } from "./facts.js";
import { challengeBadges } from "./rules/challenges.js";
import { comebackBadges } from "./rules/comebacks.js";
import { finishingBadges } from "./rules/finishing.js";
import { gardenBadges } from "./rules/garden.js";
import { gettingStartedBadges } from "./rules/gettingStarted.js";
import { loggingBadges } from "./rules/logging.js";
import { metaBadges } from "./rules/meta.js";
import { streakBadges } from "./rules/streaks.js";
import type { ChapterId } from "./types.js";

// Every achievement badge, in book order: chapters in this order, and badges
// in list order inside a chapter (easy to hard). The list is
// docs/badges-ideas.md. Secret badges (section 9) are not built yet.

export const CHAPTERS: readonly { id: ChapterId; title: string }[] = [
  { id: "getting-started", title: "Getting started" },
  { id: "logging", title: "Logging milestones" },
  { id: "finishing", title: "Finishing habits" },
  { id: "streaks", title: "Streaks" },
  { id: "garden", title: "Garden and plants" },
  { id: "comebacks", title: "Comebacks" },
  { id: "challenges", title: "Hard challenges" },
  { id: "secret", title: "Secret badges" },
  { id: "meta", title: "Badge collector" },
];

const ordinary: Badge[] = [
  ...gettingStartedBadges,
  ...loggingBadges,
  ...finishingBadges,
  ...streakBadges,
  ...gardenBadges,
  ...comebackBadges,
  ...challengeBadges,
];

export const BADGES: readonly Badge[] = [...ordinary, ...metaBadges(ordinary)];

export const BADGES_BY_ID: ReadonlyMap<string, Badge> = new Map(
  BADGES.map((badge) => [badge.id, badge]),
);
