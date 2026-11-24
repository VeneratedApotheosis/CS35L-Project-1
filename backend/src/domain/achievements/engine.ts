import { BADGES } from "./catalog.js";
import { buildFacts, type Badge } from "./facts.js";
import type { BadgeInput, Progress } from "./types.js";

// Runs every badge rule against one user's data. Pure: the service loads the
// input and stores what comes back.

export type BadgeCheck = {
  // Progress for every badge with a built rule. Missing for unbuilt ones.
  progress: Map<string, Progress>;
  // Every earned id: the ones already stored plus the new ones.
  earned: Set<string>;
  // Ids earned in this check that were not in `input.earned`, in book order.
  newlyEarned: string[];
};

function isReached(progress: Progress): boolean {
  return progress.count >= progress.target;
}

export function evaluateBadges(
  input: BadgeInput,
  badges: readonly Badge[] = BADGES,
): BadgeCheck {
  const facts = buildFacts(input);
  const progress = new Map<string, Progress>();

  const run = (badge: Badge): boolean => {
    if (!badge.evaluate) return false;
    const result = badge.evaluate(facts);
    progress.set(badge.id, result);
    if (isReached(result) && !facts.earned.has(badge.id)) {
      facts.earned.add(badge.id);
      return true;
    }
    return false;
  };

  for (const badge of badges) if (!badge.meta) run(badge);

  // Meta badges count earned badges, including each other, so repeat until a
  // pass earns nothing. That last pass also leaves every meta badge's progress
  // up to date. Each other pass earns at least one badge, so this ends.
  const meta = badges.filter((badge) => badge.meta);
  let changed = true;
  while (changed) {
    changed = false;
    for (const badge of meta) if (run(badge)) changed = true;
  }

  const newlyEarned = badges
    .map((badge) => badge.id)
    .filter((id) => facts.earned.has(id) && !input.earned.has(id));
  return { progress, earned: facts.earned, newlyEarned };
}
