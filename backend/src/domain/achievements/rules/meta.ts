import { countTo, type Badge, type BadgeFacts } from "../facts.js";

// Section 10 of docs/badges-ideas.md: badges for earning badges. They count
// `facts.earned`, which the engine updates during a check, so earning Ten Taps
// can earn Trophy Case in the same check. Built from the rest of the catalog,
// so only ids that exist are counted.

export function metaBadges(others: readonly Badge[]): Badge[] {
  const secretIds = new Set(
    others.filter((badge) => badge.secret).map((badge) => badge.id),
  );
  const base = { chapter: "meta", secret: false, meta: true } as const;

  const ids = new Set(others.map((badge) => badge.id));
  const metaIds = [
    "trophy-case",
    "shelf-of-honours",
    "hall-of-plants",
    "secret-keeper",
    "truffle-pig",
    "completionist",
  ];
  for (const id of metaIds) ids.add(id);

  const earnedCount = (facts: BadgeFacts) =>
    [...facts.earned].filter((id) => ids.has(id)).length;
  const secretCount = (facts: BadgeFacts) =>
    [...facts.earned].filter((id) => secretIds.has(id)).length;

  // Every non-secret badge except Completionist itself.
  const completionIds = [...ids].filter(
    (id) => !secretIds.has(id) && id !== "completionist",
  );

  return [
    {
      ...base,
      id: "trophy-case",
      name: "Trophy Case",
      description: "Earn 5 badges.",
      tier: "bronze",
      evaluate: (facts) => countTo(earnedCount(facts), 5),
    },
    {
      ...base,
      id: "shelf-of-honours",
      name: "Shelf of Honours",
      description: "Earn 15 badges.",
      tier: "silver",
      evaluate: (facts) => countTo(earnedCount(facts), 15),
    },
    {
      ...base,
      id: "hall-of-plants",
      name: "Hall of Plants",
      description: "Earn 30 badges.",
      tier: "gold",
      evaluate: (facts) => countTo(earnedCount(facts), 30),
    },
    {
      ...base,
      id: "secret-keeper",
      name: "Secret Keeper",
      description: "Find 3 secret badges.",
      tier: "silver",
      evaluate: (facts) => countTo(secretCount(facts), 3),
    },
    {
      ...base,
      id: "truffle-pig",
      name: "Truffle Pig",
      description: "Find 10 secret badges.",
      tier: "gold",
      evaluate: (facts) => countTo(secretCount(facts), 10),
    },
    {
      ...base,
      id: "completionist",
      name: "Completionist",
      description: "Earn every non-secret badge.",
      tier: "platinum",
      evaluate: (facts) =>
        countTo(
          completionIds.filter((id) => facts.earned.has(id)).length,
          completionIds.length,
        ),
    },
  ];
}
