# Habit Garden: Badges build plan

How achievement badges go from a rule in [badges-ideas.md](badges-ideas.md) to a medal on the Badges page. This covers the database, the backend rules, when badges are checked, the API and the frontend. The badge list itself is final and is not changed here, except for the few conflicts in [section 9](#9-conflicts-in-the-badge-list).

Issues: #250 (parent), #253 (Badges page), #252 and #254 (finished habits). Deadline Dec 1.

## Contents

- [1. Summary](#1-summary)
- [2. Where each piece lives](#2-where-each-piece-lives)
- [3. Database](#3-database)
- [4. The rules engine (backend `domain/`)](#4-the-rules-engine-backend-domain)
- [5. When badges are checked](#5-when-badges-are-checked)
- [6. API](#6-api)
- [7. Frontend](#7-frontend)
- [8. End to end, step by step](#8-end-to-end-step-by-step)
- [9. Conflicts in the badge list](#9-conflicts-in-the-badge-list)
- [10. Testing](#10-testing)
- [11. Build order and tickets](#11-build-order-and-tickets)
- [12. Decisions to confirm](#12-decisions-to-confirm)

---

## 1. Summary

- **Rules live in backend code, not SQL.** Every badge is a pure function in `backend/src/domain/achievements/`, built on the period, progress, streak, growth and health rules that already exist there. Rewriting those rules in SQL would give us two copies that drift apart.
- **The database stores only what was earned.** That is one new table, `user_badges` (`user_id`, `badge_id`, `earned_at`, `seen_at`), plus one small function, `award_badges`, that inserts new rows and returns only the ones that really are new.
- **Badges are checked on every write that can earn one**, and once on app load. Writes are adding a log, creating a habit and changing the display name. The app-load check catches badges earned by time passing, such as a habit expiring.
- **"Ever happened" beats "true right now".** Wherever the data allows, a rule looks at the whole history, for example the best streak a habit ever had rather than its current streak. A check that runs late then still awards the badge.
- **Writes return `new_badges`.** The log, create-habit and profile responses gain a `new_badges` field, and the app shows the "Badge earned" toast or dialog from it.
- **`GET /me/badges` returns the whole book.** It gives chapters, badges, state (earned, in progress or locked), progress and dates. Secret badges are left out until earned. Icons stay in the frontend.

## 2. Where each piece lives

| Piece | Where | Why |
| --- | --- | --- |
| Badge catalog (id, name, rule text, tier, chapter, secret, target) | `backend/src/domain/achievements/catalog.ts` | One source of truth. The backend has to know about secret badges, but must not send them before they are earned |
| Badge rules | `backend/src/domain/achievements/rules/*.ts` | Pure and tested like the rest of `domain/` |
| Loading data and awarding | `backend/src/services/achievements.ts` | Reads habits, logs and profile, runs the rules, calls `award_badges` |
| Earned records | `public.user_badges` table | Earned badges are permanent, even after the habit or log behind them is deleted |
| Atomic award | `public.award_badges(text[])` SQL function | Insert-if-new in one statement, so two requests at the same time never both report the same badge as new |
| Icons | `frontend/src/views/badges/badgeIcons.ts` (`id -> LucideIcon`) | Icons are a frontend concern. The ones in `placeholderBadges.ts` move here |
| Page, toast and dialog | `frontend/src/views/badges/*`, a `BadgeNotifier` in the signed-in layout | The page reads the API instead of placeholders |

## 3. Database

New migration: `supabase/migrations/20261125_01_user_badges.sql`.

```sql
create table public.user_badges (
  user_id   uuid not null default auth.uid()
              references public.profiles(id) on delete cascade,
  badge_id  text not null check (badge_id ~ '^[a-z0-9-]{1,64}$'),
  earned_at timestamptz not null default now(),
  seen_at   timestamptz,          -- null until the app has shown the "Badge earned" moment
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "badges: read own"   on public.user_badges for select to authenticated using (user_id = auth.uid());
create policy "badges: add own"    on public.user_badges for insert to authenticated with check (user_id = auth.uid());
create policy "badges: mark seen"  on public.user_badges for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Permanent: no delete policy. Only seen_at can change.
revoke update on public.user_badges from anon, authenticated;
grant  update (seen_at) on public.user_badges to authenticated;

-- Inserts the given badges for the caller and returns only the rows that were new.
-- security invoker: RLS still applies, and auth.uid() is the caller.
create function public.award_badges(p_badge_ids text[])
returns setof public.user_badges
language sql
security invoker set search_path = ''
as $$
  insert into public.user_badges (user_id, badge_id)
  select auth.uid(), unnest(p_badge_ids)
  on conflict (user_id, badge_id) do nothing
  returning *;
$$;
```

Notes:

- **Primary key `(user_id, badge_id)`** means a badge is earned once. `on conflict do nothing ... returning` returns only the rows that were inserted, so a double-tapped log can never show the same toast twice.
- **`seen_at`** is the one extra column beyond the agreed `user_id, badge_id, earned_at`. It records whether the "Badge earned" moment was shown. Without it, a badge earned by a habit expiring overnight has no way to pop up the next morning, or would pop up on every device. It tracks badges, not user behaviour, so it fits the "no new tracking" rule.
- **Account deletion** cascades through `profiles`. Check that the account-deletion function in `user_signup_deletion_functions.sql` needs no change.
- **Forgery trade-off.** The backend only has the publishable key and the user's token (backend design section 9). Anything the backend can insert, the user can also insert straight through the Supabase API. So a determined user can award themselves badges. Badges are personal with no leaderboard, so we accept this. The real fixes are a service-role key used only for awarding, or the rules in SQL, and both cost more than they are worth before Dec 1. Write this down in `docs/database/design.md`.
- **Rules are not in SQL.** We considered SQL functions for counts such as "total logs". They would save one query, but split the rules between two languages. All rules stay in TypeScript.

## 4. The rules engine (backend `domain/`)

### 4.1 Shapes

```ts
type BadgeTier = "bronze" | "silver" | "gold" | "platinum";
type ChapterId = "getting-started" | "logging" | "finishing" | "streaks" | "garden"
               | "comebacks" | "hard" | "secret" | "meta";

type BadgeDef = {
  id: string;                 // stable, kebab-case. Never rename once shipped
  chapter: ChapterId;
  name: string;
  description: string;        // the "How to earn it" text
  tier: BadgeTier;
  secret: boolean;
  // Returns progress. Earned when count >= target. Yes/no badges use target 1.
  evaluate: (ctx: BadgeContext) => { count: number; target: number };
};

// Everything a rule may read. Built once per check by the service.
type BadgeContext = {
  today: string;              // in the profile timezone (UTC when unset)
  now: DateTime;              // the current time, for time-of-day rules
  timezone: string;
  profile: { display_name: string; display_name_set: boolean };
  habits: Array<Habit & {
    logs: { occurred_on: string; created_at: string }[];  // oldest first
    stats: FullStats;         // existing fullStats(habit, logs, today)
  }>;
  earned: Set<string>;        // already in user_badges, used by the meta badges
};
```

`evaluate` always returns `{count, target}`, so one function gives both "is it earned?" and the progress ring ("7 of 10"). The result is capped at `target` when it goes back to the client.

### 4.2 Shared helpers

Helpers go in `achievements/history.ts` so the rules stay one-liners:

| Helper | Used by |
| --- | --- |
| `allLogs(ctx)`: every log with its habit, in order | Logging totals, Nice, Blaze It, Over 9000 |
| `logsPerDay(ctx)`: `date -> count` and `date -> habit ids` | Busy Day, Every Hand on Deck, Lucky Seven, Hundred Days, Perfect Year |
| `bestStreak(periods)`: longest run of `met` periods in `periodSummaries` | Every streak badge (best ever, not current) |
| `finished(ctx)`: expired habits with `badge !== "none"` | Finishing chapter, Hall of Fame |
| `replayDays(ctx, from, fn)`: calls `fn(day, view)` for each day, where `view` holds each habit's state, stage, health and streak *as of that day* | Every "at once" or "at some point" badge |
| `localTime(created_at, tz)` | Early Bird, Night Owl, Midnight Gardener, New Year, Backdated |

`replayDays` works because every rule in `domain/` already takes `today` as a parameter and the logs are stored with their dates. Running `plantHealth(habit, logsUpTo(day), day)` for each past day gives the real history. Cost: days since the first habit times active habits. That is a few thousand pure calls for a heavy user, which is fine. Only rules that need replay call it, and it runs at most once per check, with the result shared across rules.

### 4.3 How each chapter is worked out

| Chapter | Data it needs | Style |
| --- | --- | --- |
| 1. Getting started | Habit count, best stage ever (replay or the current stage, since stage only grows), backdated logs (`occurred_on` before the local date of `created_at`), `display_name_set` | Simple |
| 2. Logging milestones | Log totals, per-period counts against the target (`periodSummaries`), per-day counts | Simple |
| 3. Habit completion | `finished(ctx)`: badge level, `final_progress`, `final_consistency`, `num_periods`, `plant_type`, end date | Simple. Clean Sweep only checks months that have ended |
| 4. Streaks | `bestStreak` per habit. Unbroken and Triple Threat need streaks at the same time, so they use replay. Daily Devotion and Weekend Warrior use log dates | Simple, plus replay |
| 5. Garden and plants | Plant types used, counts at the same time (replay), stage 4 and Healthy across 4 periods | Replay |
| 6. Comebacks | Met and missed sequences from `periodSummaries`, Wilted then Healthy (replay of health), gaps between log days | Mixed |
| 8. Hard | Logs on every day across a run, health history, seasons and days of the week of end dates | Replay |
| 9. Secret | `created_at` time of day, special dates, log number N, habit `start_date` against `created_at` | Simple |
| 10. Meta | `earned`, plus the badges newly earned in this pass | Runs last |

**Meta badges need a second pass.** Earning Ten Taps can earn Trophy Case in the same check. So the engine runs the normal badges, adds the newly earned ones to `earned`, then runs the meta badges in a loop until nothing new appears. Two or three passes at most.

**Personal Touch** cannot be worked out from stored data (the profile does not say whether the name was typed or came from Google). It is awarded directly by `PATCH /me` when `display_name` is in the body, the same way a log awards Ten Taps. `display_name_set` is true only during that request.

### 4.4 Output

```ts
evaluateBadges(ctx) -> Map<badgeId, { count: number; target: number; earned: boolean }>
```

Pure. No database access, no clock other than `ctx.now`. Easy to test.

## 5. When badges are checked

There is no cron or background worker. Badges are checked at the moments the data changes, plus once when the app loads.

| Trigger | Endpoint | Badges it can earn | Shown how |
| --- | --- | --- | --- |
| Add a log | `POST /habits/:id/logs` | Most of them: logging, stages, streaks, comebacks, secrets, meta | `new_badges` in the response, toast right away |
| Create a habit | `POST /habits` | Seed Money, Roots Down, Overgrown, Jungle, Matching Set, Shelf Full, Second Floor, New Year, The Long Wait | `new_badges` in the response |
| Change display name | `PATCH /me` | Personal Touch (+ meta) | `new_badges` in the response |
| **Time passes** (a habit expires, a period closes) | `GET /me/badges` | Finishing chapter, streaks that close at period end, Clean Sweep, Sunday Best, Four Seasons | Unseen badges come back in `unseen`, and the app shows them on load |
| Delete a log or habit | none | Nothing. Badges are never taken away | none |

Why "on app load" covers expiry: a habit expires when its end date passes, which is not a request. The next time the user opens the app, the signed-in layout calls `GET /me/badges/unseen` (cheap). That runs a check first and returns any badges with `seen_at` still null. So a habit that finished overnight shows "First Harvest" on the next visit, on whichever device opens first.

**A failed check never fails the write.** The service wraps the check in a try/catch. If it fails, it logs the error and returns `new_badges: []`. The log is still saved, and the next check awards what was missed, because rules look at the whole history.

**Cost.** Each check reads every habit and log the user owns, which is one more read on top of what `addLog` already does. That is fine at our sizes. Measure it in #348 (load time). If it is slow, only run the chapters whose data changed (a log touches chapters 2 and 4, a new habit touches 1 and 5).

**Shared habits do not count** for now (decided scope: self-earned only). Rules read only `habits` and `activity_logs`. Shared habit logs live in `shared_habit_logs` and are left out. Shared habit endpoints do not trigger checks.

## 6. API

### 6.1 `GET /me/badges`

Runs a check first (awarding anything new), then returns the book.

```json
{
  "earned_count": 11,
  "visible_count": 68,
  "chapters": [
    {
      "id": "logging",
      "title": "Logging milestones",
      "badges": [
        {
          "id": "ten-taps",
          "name": "Ten Taps",
          "description": "Log 10 activities in total.",
          "tier": "bronze",
          "secret": false,
          "state": "in_progress",
          "progress": { "count": 7, "target": 10 },
          "earned_at": null
        }
      ]
    }
  ],
  "unseen": ["first-harvest"]
}
```

- `state` is `earned` (has a row), `in_progress` (`0 < count < target`, and `target > 1`), or `locked`.
- **Secret badges** appear only when earned, in a `secret` chapter that is missing entirely until the first one is earned. `visible_count` counts them only once earned, so the total never gives away how many exist.
- Badges are in list order within a chapter (easy to hard), matching decision B3 in [badges-book.md](frontend/badges-book.md).

### 6.2 `GET /me/badges/unseen`

Runs a check and returns only the earned badges with `seen_at` null, as full badge objects. Used once on app load.

### 6.3 `POST /me/badges/seen`

Body `{ "ids": ["first-harvest"] }`. Sets `seen_at = now()` where it is null. Returns 204.

### 6.4 Additions to existing responses

The `new_badges: Badge[]` field (same badge shape, `state: "earned"`) is added to:

- `POST /habits/:id/logs`: `{ log, stats, new_badges }`
- `POST /habits`: the habit object gets a top-level `new_badges`, or the response becomes `{ habit, new_badges }`. **Confirm the shape** with the frontend owner. Adding a field is safer than wrapping
- `PATCH /me`: `{ ...me, new_badges }`

These are additions only, so current clients keep working.

### 6.5 Finished-habit results

The per-habit Bronze, Silver and Gold results stay where they are: `GET /habits?status=finished` already returns `stats.badge`, `final_progress` and `final_consistency`. The "Finished habits" chapter in the book (K1) reads that endpoint. No new backend work is needed for #252 or #254 beyond what exists.

## 7. Frontend

| File | Change |
| --- | --- |
| `lib/badges.ts` (new) | Types (`Badge`, `BadgeBook`), `getBadges()`, `getUnseenBadges()`, `markBadgesSeen(ids)`, `badgeKeys.all(userId)` |
| `views/badges/badgeIcons.ts` (new) | `Record<badgeId, LucideIcon>` with a fallback icon (`Award`) for unknown ids, so a new backend badge never crashes the page |
| `views/badges/placeholderBadges.ts` | Delete once the page reads the API. Keep `?demo=empty` by mocking the query in tests only, or drop it |
| `views/Badges.tsx` | `useQuery(badgeKeys...)`. Loading, error and empty states as in badges-book L1–L3. Map the API badge plus its icon to `BadgeInfo` |
| `components/BadgeNotifier.tsx` (new) | Mounted in the signed-in layout. Holds a queue of new badges. Bronze and Silver show a toast, Gold, Platinum and secret badges show a dialog (decision M1). "View in book" goes to `/badges?page=N#badge-id`. After showing, calls `markBadgesSeen` |
| `lib/logs.ts`, `lib/habits.ts`, `lib/profile.ts` | Add `new_badges?: Badge[]` to the result types |
| `useHabitLogging.ts`, Garden quick-log, Create habit, Settings name | Pass `result.new_badges` to the notifier (`useBadgeNotifier().push(...)`) and invalidate `badgeKeys` |
| Signed-in layout | On mount, `getUnseenBadges()` and push the results into the notifier |

The notifier queue means three badges from one log show one after another, not all at once.

## 8. End to end, step by step

1. **Create a habit.** `POST /habits` inserts the habit, then runs `checkBadges`, which loads the context, evaluates it and calls `award_badges(["seed-money"])`. The response carries `new_badges: [Seed Money]` and the app toasts "Badge earned: Seed Money".
2. **Log an activity.** `POST /habits/:id/logs` inserts the log, works out stats, then runs `checkBadges`, which awards First Drop of Water. If it is 5:30 AM local time, it also awards Early Bird (secret, shown in a dialog). Trophy Case appears once 5 are earned, in the same response, because of the meta pass.
3. **Keep logging over weeks.** Each log may earn streak, stage and count badges. Progress rings on the Badges page come from `GET /me/badges`.
4. **The habit's end date passes overnight.** Nothing runs. The next app open calls `GET /me/badges/unseen`, which checks, awards First Harvest and Gold Standard, and returns them as unseen. The app shows them, then marks them seen.
5. **Delete the habit later.** Its badges stay in `user_badges`. In-progress counts (for example "Ten Harvests: 3 of 10") may go down, because they count what exists now. Earned badges never go away.
6. **Open the Badges page.** `GET /me/badges` gives the chapters. The book renders slots, rings and locks, and the secret chapter appears once one has been found.

## 9. Conflicts in the badge list

The list is final, but these few rules cannot be built exactly as written. Each has a proposed reading. Confirm before building.

| Badge | Problem | Proposal |
| --- | --- | --- |
| **Fashionably Late** (secret) | Needs a shared habit, which is out of scope | Leave it out of the catalog for now. Otherwise **100%** can never be earned |
| **100%** | Depends on every secret badge being earnable | Counts only badges in the catalog, so it works once Fashionably Late is out |
| **Zen Master** | "Open the app" is not tracked | Read it as "a gap of 30 or more days between two log days". It overlaps Welcome Back (14 days), which is fine |
| **Shelf Full / Second Floor** | Shelf width depends on screen size, and the backend does not know it | Define it as 3 or more, and 4 or more, habits on the garden at once (3 per shelf, as in the rule) |
| **Complete Collection** | Spider plant and calathea are not in `PLANT_TYPES` yet (stretch #286) | Use `PLANT_TYPES` as it is at check time. Adding a plant later makes it harder, and earned badges stay |
| **Clean Sweep** | Could be awarded mid-month and then broken by a Bronze later that month | Only check calendar months that have ended |
| **Personal Touch** | No stored "name was set" fact | Awarded by `PATCH /me` (section 4.3). Users who renamed before launch do not get it. Accept |
| **Quarter Year, Daily Devotion** | "Weekly habit" and "daily habit" are not defined | Weekly means `interval_unit = week, interval_count = 1`. Daily means `day, 1` |
| **Time-of-day secrets** | Logs made before a timezone change | Use the profile timezone at check time. Rare edge case, accept |

## 10. Testing

- **Domain (most of the tests).** One `describe` per chapter in `achievements/*.test.ts`. A small fixture builder (`habit({...}).logs("2026-11-01", ...)`) and a fixed `today` and `now`. Test each badge at threshold minus 1 (not earned, correct progress) and at threshold (earned). Include timezone edge cases for time-of-day and "same day", and the meta second pass.
- **Service.** `services/achievements.test.ts` with `fakeSupabase`: awards only new ids, a failed check returns `[]` and does not throw, and shared habit logs are ignored.
- **HTTP.** `logs.http.test.ts`, `habits.http.test.ts` and `me.http.test.ts` check that `new_badges` is present. A new `badges.http.test.ts` checks the book shape, that secret badges are hidden until earned, and the `seen` flow.
- **Database (by hand, like the other RLS checks).** Two concurrent `award_badges` calls return the badge once. A user cannot read or insert another user's rows. Delete is refused. Only `seen_at` can be updated. Add the steps to `docs/dev/`.
- **Frontend.** Badges page from a mocked query (earned, in progress, locked, secret, empty, error). `BadgeNotifier` queue order and toast versus dialog by tier. Logging pushes `new_badges`.

## 11. Build order and tickets

Each step can be merged on its own. Stop after any step and the app still works.

| # | Step | Area | Size |
| --- | --- | --- | --- |
| 1 | Migration: `user_badges` and `award_badges`, plus database docs | database | S |
| 2 | Catalog plus engine skeleton (`BadgeDef`, context, meta pass), with chapters 1, 2, 3, 4 (simple rules) and 10 | backend | M |
| 3 | `services/achievements.ts` (`checkBadges`), `GET /me/badges`, `/unseen`, `POST /seen` | backend | M |
| 4 | Badges page reads the API, `badgeIcons.ts`, delete the placeholders | frontend | S |
| 5 | `new_badges` on log, create habit and profile, plus `BadgeNotifier` (toast and dialog) and the load-time unseen check | backend + frontend | M |
| 6 | `replayDays` plus the "at once" and history rules (chapters 4 extras, 5, 6, 8) | backend | M–L |
| 7 | Secret chapter (9) and secret handling in the book | backend + frontend | S |
| 8 | Docs: backend design new section 8.12 (achievements) and 6.7 (endpoints), update the status line in badges-ideas.md, screens.md | docs | S |

**Status (Nov 24).** Steps 1 to 5 are built (#395), and the migration has been run on Supabase. Only personal habit logs push badges (shared logging does not), and the badge toast sits one toast-height above the Undo toast (`toast--raised`). The placeholders and `?demo=empty` are gone (tests cover the new-user state with `emptyBadgeBook`). Step 2 also built the garden badges that need no replay (everything in section 5 except Greenhouse and Prize Winner). Still unbuilt: Unbroken, Triple Threat Streak, Greenhouse, Prize Winner, all of chapters 6 and 8, and the secret badges (steps 6 and 7). Finished habits are planned separately in [habit-history-plan.md](frontend/habit-history-plan.md).

Steps 1 to 5 are the minimum for Dec 1: a real book with live progress and "Badge earned" moments. Steps 6 and 7 fill in the harder chapters. Until they land, their badges show as locked with no progress.

## 12. Decisions to confirm

1. Rules in TypeScript and only earned rows in the database (section 1). Accept the forgery trade-off (section 3).
2. `seen_at` column for the "Badge earned" moment on the next visit (section 3).
3. Response shape for `POST /habits`: add `new_badges` as a field, or wrap it (6.4).
4. The proposals in section 9, especially leaving out Fashionably Late.
5. Shared habit logs do not count toward any badge for now (section 5).
