// Shapes for achievement badges (docs/badges-ideas.md, docs/badges-plan.md).
// These are the account-wide badges, not the per-habit Bronze, Silver and Gold
// results in `../badges.ts`.

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export type ChapterId =
  | "getting-started"
  | "logging"
  | "finishing"
  | "streaks"
  | "garden"
  | "comebacks"
  | "challenges"
  | "secret"
  | "meta";

export type BadgeLog = {
  // Local date the activity happened.
  occurred_on: string;
  // When the log was saved (timestamptz from the database).
  created_at: string;
};

// A habit with every log it has, oldest first.
export type BadgeHabit = {
  id: string;
  plant_type: string;
  target_count: number;
  interval_count: number;
  interval_unit: string;
  num_periods: number | null;
  start_date: string;
  created_at: string;
  logs: readonly BadgeLog[];
};

// Everything a check reads. The service loads it, and the engine stays pure.
export type BadgeInput = {
  // Today in the profile timezone.
  today: string;
  // The profile timezone, or null for UTC.
  timezone: string | null;
  habits: readonly BadgeHabit[];
  // True only while handling a request that sets the display name, because the
  // profile does not record whether the name was typed or came from sign-in.
  displayNameSet?: boolean;
  // Badge ids already in user_badges. Earned badges are permanent.
  earned: ReadonlySet<string>;
};

// How far along a badge is. Earned once count reaches target. Yes or no badges
// use a target of 1.
export type Progress = { count: number; target: number };

export type BadgeDef<Facts = unknown> = {
  // Stable and kebab-case. Never rename one that has shipped, because
  // user_badges stores it.
  id: string;
  chapter: ChapterId;
  name: string;
  // The "How to earn it" text from badges-ideas.md.
  description: string;
  tier: BadgeTier;
  secret: boolean;
  // Meta badges count other badges, so they run after the rest.
  meta?: boolean;
  // Missing while the rule is not built yet. Such a badge shows as locked.
  evaluate?: (facts: Facts) => Progress;
};
