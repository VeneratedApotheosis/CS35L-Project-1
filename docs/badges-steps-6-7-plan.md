# Habit Garden: Badges steps 6 and 7

Steps 6 and 7 of [badges-plan.md](badges-plan.md) section 11. Step 6 builds the rules still missing from chapters 4, 5, 6 and 8 (the ones that need history). Step 7 builds the secret chapter (9). The book, the API, the notifier and the meta pass already exist (#395), so this is almost all backend `domain/achievements/`.

## Contents

1. [Where things stand](#1-where-things-stand)
2. [The timeline (replay)](#2-the-timeline-replay)
3. [Rules, badge by badge](#3-rules-badge-by-badge)
4. [Secret badges (step 7)](#4-secret-badges-step-7)
5. [Testing](#5-testing)
6. [Build order](#6-build-order)
7. [Decisions to confirm](#7-decisions-to-confirm)

## 1. Where things stand

- **Built:** chapters 1, 2, 3 and 10, plus most of 4 and 5. Each rule reads `BadgeFacts` (`facts.ts`): per-habit periods, result, stage, best streak, and logs per day.
- **Listed but unbuilt (no `evaluate`, shown locked):**
  - Chapter 4: Unbroken, Triple Threat Streak.
  - Chapter 5: Greenhouse, Prize Winner.
  - All 8 of chapter 6 and all 10 of chapter 8 (`rules/later.ts`).
- **Not in the catalog:** the 17 secret badges.
- **Already handled for secrets:**
  - `getBadgeBook` leaves out an unearned secret badge, and leaves out the whole Secret chapter until one is earned.
  - The frontend groups show secrets only as earned, and the count shows no total.
  - `BadgeNotifier` opens the dialog titled "Secret badge found".
  - `metaBadges` already counts secret ids for Secret Keeper and Truffle Pig, and leaves them out of Completionist.

So step 6 needs one new piece of machinery, the timeline. Step 7 is mostly rules plus icons.

**Status (Nov 24).** Step 6 is built. 6a (#403): `rules/comebacks.ts` and `rules/challenges.ts` replace `rules/later.ts`, and the test builders moved to `src/test/badgeHabits.ts`. 6b: `timeline.ts` with `timeline.test.ts`, and the 9 replay badges with `replay.test.ts`. Next: 7 (secret badges).

## 2. The timeline (replay)

Some badges ask what was true at once or at some point: stage 4 on 6 plants at once, Wilted then Healthy again, 5 habits Healthy for 8 weeks. The stored data can answer these because the `domain/` rules are pure functions of `(habit, logDates, today)`. Running them with `today = D` and only the logs up to `D` gives the state as of `D`.

**Do not replay every day.** A habit's state can only change on a few days:

| Value | Changes on |
| --- | --- |
| Active | `start_date` and `endDate` |
| Stage (overall progress) | a log date |
| Health (last 4 completed periods) | a period boundary (a period completing) |
| Streak (rule 8.6, `currentStreak`) | a log date (the current period becomes met) or a period boundary (a miss completes) |

So each habit gets **checkpoints**: its start, every period boundary, every log date and its end date, all up to `today`. The state is constant from one checkpoint to the next. This turns "every day × every habit" into a list of segments.

New file `achievements/timeline.ts`:

```ts
type HabitMoment = {
  from: string;              // first day of this state
  to: string;                // first day of the next state (exclusive), or today + 1
  active: boolean;
  stage: GrowthStage;
  health: PlantHealth;
  streak: number;            // currentStreak as of `from`
};

// One habit's history as segments, oldest first. Pure.
export function habitTimeline(facts: HabitFacts, today: string): HabitMoment[];

// Sweeps every habit's segments together and calls `fn` once per stretch where
// no habit changes, with each habit's state in that stretch.
export function sweep(
  timelines: ReadonlyMap<string, HabitMoment[]>,
  fn: (from: string, to: string, states: ReadonlyMap<string, HabitMoment>) => void,
): void;

// Longest run of days on which `test` holds, from a sweep. Used by the
// "for 8 weeks" and "for a year" badges.
export function longestRun(timelines, test: (states) => boolean): number;
```

- **Built once per check.** Add `timelines` to `BadgeFacts`, so every replay rule shares one copy (badges-plan 4.2).
- **One pass per habit.** Calling `overallProgress`, `healthRate` and `currentStreak` at every checkpoint would redo the luxon date maths for every log each time, which is far too slow for a year of daily logs. So `habitTimeline` walks the checkpoints once, keeping running period counts, the 4-period health window and the streak. `timeline.test.ts` checks it against those functions on every day of several habits.
- **Backdated logs change the past.** The replay uses `occurred_on`, so a log entered late counts as if logged on time. This is the same reading Daily Devotion and Clean Sweep already use. Accept it.
- **Deleted habits are gone.** Same as `mostActiveAtOnce`. Earned badges stay.

## 3. Rules, badge by badge

"Finished" means what `facts.ts` already means: expired with Bronze or better.

### Step 6a: rules that need no timeline

These go in `rules/comebacks.ts` and `rules/challenges.ts`, which replace `rules/later.ts`.

| Badge | Rule | Progress shown |
| --- | --- | --- |
| Second Wind | Some habit has a completed miss followed by a met period (completed, or the current one once met) | yes/no |
| Bounce Back | A completed miss followed by 3 met periods in a row | best run after a miss, of 3 |
| Welcome Back | Two log days, across all habits, at least 14 days apart, with no log between them | yes/no |
| Clutch | A period whose count reached the target on its last day: the logs before `end − 1` are below target, and with that day included it is met. One-day periods are left out, or every met day of a daily habit would count | yes/no |
| Down to the Wire | A finished habit with `final_progress = 1` whose final period became met on its last day and that day's logs were needed to reach 100% (so a daily habit only earns it by catching up) | yes/no |
| Iron Routine | 3 finished habits with `final_consistency = 1` | n of 3 |
| Perfect Year | `longestDayRun(all log dates) ≥ 365` | run of 365 |
| The Hundred Days | `longestDayRun ≥ 100` | run of 100 |
| Quit Quitting | 5 finished habits with `num_periods ≥ 8` | n of 5 |
| Grandmaster Gardener | 25 habits with result Gold | n of 25 |
| Four Seasons | Finished habits whose last days fall in all 4 seasons of one calendar year (Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov fall; decision 2) | most seasons in one year, of 4 |
| Year in Bloom | A finished habit with unit week or month whose start to end is at least 364 days | yes/no |
| Triple Crown | Gold on a habit with unit `day`, one with `week` and one with `month` (any `interval_count`) | units covered, of 3 |

### Step 6b: rules that use the timeline

| Badge | Chapter | Rule | Progress |
| --- | --- | --- | --- |
| Unbroken | 4 | Some stretch where 3 habits each have `streak ≥ 4` | most at once, of 3 |
| Triple Threat Streak | 4 | Same, with `streak ≥ 8` | most at once, of 3 |
| Greenhouse | 5 | Some stretch where 6 active habits are at stage 4 | most at once, of 6 |
| Prize Winner | 5 | One habit with 4 completed periods in a row spent wholly at stage 4 and Healthy. Health only changes at a boundary and stage never drops, so the state on each period's first day decides it | best run, of 4 |
| Wilted but Not Dead | 6 | A habit's health is `wilted` and later `healthy` | yes/no |
| Phoenix Plant | 6 | Wilted but Not Dead on a habit that finished Silver or Gold | yes/no |
| Resurrection | 6 | A habit with result Gold that was `wilted` at some point | yes/no |
| Everything Everywhere | 8 | `longestRun`: at least 5 active habits and every one of them Healthy, for 56 days (decision 1) | days, of 56 |
| Untouchable | 8 | `longestRun`: at least 1 active habit and none `wilted`, for 365 days (decision 3) | days, of 365 |

Phoenix and Resurrection take only completed history, so a habit's own expiry is enough. Badges with no stored progress (yes/no) stay "locked" until earned, as they do now.

## 4. Secret badges (step 7)

New file `rules/secret.ts`. Each badge has `chapter: "secret", secret: true`. A new helper, `localTime(created_at, zone)`, goes in `facts.ts` next to `localDate`.

| Badge | Rule |
| --- | --- |
| Early Bird | A log saved between 4:00 and 5:59 local time (decision 4) |
| Night Owl | A log saved between 0:00 and 3:59 local time |
| Midnight Gardener | A log saved between 0:00 and 0:05 local time |
| New Year, New Me | A habit created on Jan 1, local date of `created_at` |
| Leap of Faith | A log with `occurred_on` on Feb 29 |
| Lucky Seven | A day with 7 or more logs (`facts.days`) |
| Procrastinator | 5 backdated logs (`occurred_on` before the local date of `created_at`) saved on the same local day |
| Nice | `totalLogs ≥ 69` |
| Blaze It | `totalLogs ≥ 420` |
| Over 9000 | `totalLogs ≥ 9001` |
| Sunday Best | A finished habit whose last day is a Sunday |
| Friday the 13th | A log with `occurred_on` on a Friday the 13th |
| Overgrown | `mostActiveAtOnce ≥ 12` |
| Zen Master | Two log days 30 or more days apart with nothing between (badges-plan section 9) |
| The Long Wait | A habit whose `start_date` is at least 6 months after the local date of its `created_at` |
| Fashionably Late | **Left out** (needs shared habits, badges-plan section 9) |
| 100% | Meta. Every other catalog id, secret ones included, is earned |

Wiring:

- **Catalog.** Add `secretBadges` to `ordinary` in `catalog.ts`. Add `hundred-percent` in `metaBadges` with `chapter: "secret", secret: true, meta: true`, so it runs in the meta loop but shows in the Secret chapter.
- **Counts.** Secret Keeper and Truffle Pig count secret ids, including 100%. Completionist stays non-secret only, and Hall of Plants counts all.
- **API.** No change. Unearned secrets are already filtered out of the book, and `/unseen` returns earned ones in full. Add an HTTP test that an unearned secret never appears anywhere in `GET /me/badges`: not in chapters, not in `visible_count`.
- **Frontend.**
  - Add icons for the 14 new secret ids to `badgeIcons.ts` (Early Bird, Night Owl and Leap of Faith exist).
  - Add a few secrets to `sampleBadgeBook.ts` so the style guide shows the pink medal.
  - Nothing else changes.

## 5. Testing

All in the existing pattern (`engine.test.ts`, fixed `today`, the `habit().logs()` builders), split into one file per chapter as it grows (`timeline.test.ts`, `comebacks.test.ts`, `challenges.test.ts`, `secret.test.ts`).

- **Timeline.**
  - Segments for a habit with no logs, a met-then-missed habit, and a habit that has not started yet.
  - Health turns `wilted` only on a boundary.
  - Stage changes on a log date.
  - `sweep` lines up two habits whose boundaries differ.
- **Each badge at threshold − 1 and at threshold.** For "at once" badges, also test that the same counts at different times do not earn it. Example: 3 streaks of 4 that never overlap is not Unbroken.
- **Timezone edges** for the time-of-day secrets: a 23:59 UTC log that is 15:59 in Los Angeles.
- **Meta.**
  - Earning the last secret can earn 100% in the same check.
  - Secret Keeper counts 100%.
- **Speed.** The replay of 20 habits, each daily for a year with a log every day, takes about 15 ms (the test allows 100 ms). The per-habit stats built before it (`buildFacts`, unchanged here) take about 400 ms for that same extreme account, because `periodIndexOf` calls luxon for every log. Worth trimming under #348.
- **Catalog test.** "Covers badges-ideas.md" now checks secret names too, except Fashionably Late.

## 6. Build order

Each PR can be merged on its own, and the app works after each.

| # | PR | Area | Size |
| --- | --- | --- | --- |
| 6a | Comebacks and challenges without the timeline (13 badges in 3.1), and delete `rules/later.ts` | backend | M |
| 6b | `timeline.ts` with tests, then the 9 replay badges in 3.2 | backend | M–L |
| 7 | `rules/secret.ts`, 100%, icons, sample book, secret HTTP test | backend + frontend | S–M |
| docs | backend design 8.12, status lines in badges-plan.md and badges-ideas.md | docs | S |

6a and 7 do not depend on the timeline, so either can go first. 6a is the safest start.

## 7. Decisions to confirm

The rules above use these readings. Each is easy to change later, but an earned badge stays earned, so settle them before merging.

1. **Everything Everywhere.** "Keep 5 active habits all Healthy for 8 weeks" means 56 days in a row on which at least 5 habits are active and every active habit is Healthy. They need not be the same 5 habits.
2. **Four Seasons.** Northern meteorological seasons by the month of the last day, within one calendar year. December counts as that year's winter.
3. **Untouchable.** 365 days in a row with at least one active habit and none Wilted. Slightly Wilted is allowed. Without the "at least one active" part, a user with no habits would earn it.
4. **Early Bird and Night Owl.** Make them not overlap: Night Owl is 0:00–3:59 and Early Bird is 4:00–5:59. The literal "before 6 AM" would give both badges for one 2 AM log.
5. **Replay uses `occurred_on`.** Backdated logs rewrite history for the "at once" badges. This is consistent with the existing rules.
6. **Fashionably Late stays out** until shared habits count toward badges, so 100% is reachable.
