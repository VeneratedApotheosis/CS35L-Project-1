# Habit Garden: Habit history plan

Issues: #254 (history of finished habits), the history part of #253, and #342 later (finished shared habits). Related: #252 (completed garden), #381 (phone layout for Badges).

## Contents

- [1. Summary](#1-summary)
- [2. What exists today](#2-what-exists-today)
- [3. Where it lives](#3-where-it-lives)
- [4. What the page looks like](#4-what-the-page-looks-like)
- [5. What each habit shows](#5-what-each-habit-shows)
- [6. How much fits on one page](#6-how-much-fits-on-one-page)
- [7. Data and API](#7-data-and-api)
- [8. Changes to other screens](#8-changes-to-other-screens)
- [9. States](#9-states)
- [10. Build order](#10-build-order)
- [11. Decisions to confirm](#11-decisions-to-confirm)

**Status (Nov 24).** Steps 1 to 5 are built on `feat/254-habit-history`, with two changes from the plan below. The data comes from one endpoint, `GET /me/history` (backend design 6.8), not the list endpoint plus the Dashboard: the level filter, the sort and the summary all need every result before paging, so one read of every habit does it all. And each tab keeps its own title ("Badges", "History") above the shared switch. Still to do: step 6 (Dashboard, Garden and Habit Details links) and the phone check in #381.

## 1. Summary

The history is a list of every habit that has ended, newest first, including the ones that earned no badge. Each row is a short record: the plant as it ended, the name, the goal, the dates, the level reached, and four final numbers. A row opens Habit Details, which already shows a finished habit in full, read only (calendar, activity log, final figures). So the history is an index of past habits, not a second details page.

It gets its own route, `/history`, but no navbar button. It sits next to Badges as a second tab, **Badges | History**, and the Badges nav item stays highlighted on both. The Dashboard and the Garden link to it.

## 2. What exists today

Finished habits already appear in three places, each partly:

| Where | What it shows | Limit |
| --- | --- | --- |
| Dashboard, "Finished habits" | Name (link), end date, level label, final progress, final consistency | Every finished habit, no paging. It grows without limit |
| Garden, "Completed garden" | The plant at its final stage on shelves | No numbers, and the level marker (#252) is not built. Also grows without limit |
| Habit Details (`/habit?id=`) | Everything: calendar, log, final figures. Logging is off | One habit at a time |

What is missing is one place to look back across all of them, with enough detail to compare, that still works with 50 finished habits.

## 3. Where it lives

**Recommendation: its own route (`/history`), as a tab of the Badges section, with no new navbar button.**

| Option | For | Against |
| --- | --- | --- |
| A section at the bottom of the Badges page | No new route. Matches the issue text | The badge book is already long (76 badges). History would sit under it, out of sight. Two unrelated scroll positions on one page |
| **A tab on Badges with its own route** (rec) | One nav item for "looking back". Each tab has its own URL, back button and scroll. The badges book stays as it is | A small tab bar to build |
| A fifth navbar button | Most visible | The phone bottom bar already holds Garden, Dashboard, Badges, Settings and Add. A sixth item makes each target too narrow (see #396). History is visited rarely, mostly right after a habit ends |
| A "Finished habits" chapter in the badge book (K1 in badges-book.md) | One model | Habits are records with numbers, not medals. A grid of slots hides the numbers, which are the point. Rec: drop K1 in favor of this tab |

The tab bar sits under the page title: **Badges** (`/badges`) and **History** (`/history`). It is a pair of links styled as a segmented control, with `aria-current="page"` on the current one, not ARIA tabs, because each is a real page. The page title stays "Badges and history" on both, so switching does not move the layout.

Ways in:

- The Badges nav item (stays current on `/history`).
- Dashboard: "See all finished habits" under its shortened list (section 8).
- Garden: "View history" next to the **Completed garden** heading.
- The "Badge earned" toast or dialog for a Finishing badge (First Harvest and others) can link to History with that habit highlighted. Optional, later.

## 4. What the page looks like

```
Badges and history
[ Badges ] [ History ]

┌ Summary ─────────────────────────────────────────────────────┐
│ 14 finished   ● 3 Gold  ● 5 Silver  ● 4 Bronze  ○ 2 No badge │
│ 412 activities logged · 71% average final progress           │
└──────────────────────────────────────────────────────────────┘

[All] [Gold] [Silver] [Bronze] [No badge]          Newest first ▾

November 2026
┌──────────────────────────────────────────────────────────────┐
│ (plant) Morning run                         [Gold]           │
│         3× a week for 4 weeks · Oct 27 – Nov 23              │
│         Progress 100%  Consistency 4/4  Activities 13  Best streak 4 wk  › │
├──────────────────────────────────────────────────────────────┤
│ (plant) Read before bed                     [No badge]       │
│         Every day for 2 weeks · Nov 3 – Nov 16               │
│         Progress 52%   Consistency 5/14 Activities 7   Best streak 3 d   › │
└──────────────────────────────────────────────────────────────┘
October 2026
  …
                      [ Show more (6) ]
```

- **Summary card** at the top: finished count, count per level, total activities across finished habits, and the average final progress. It answers "how am I doing overall" before any scrolling.
- **Filter chips** by level, and a sort menu: Newest first (default), Oldest first, Best result first (Gold to No badge, then by final progress).
- **Month headings** by end month ("November 2026"), so a long list is easy to scan and the user can find "that habit from the summer".
- **One row per habit**, in one card per month, separated by thin rules, like the Dashboard's lists. Whole row is the link.
- Uses the wide page measure, like Habit Details.

## 5. What each habit shows

Enough to remember the habit and compare it with others, without opening it:

| Shows | Example | Source |
| --- | --- | --- |
| Plant at its final stage and health, small (about 56px) | The pothos, stage 3, slightly wilted | `plant_type`, `stats.stage`, `stats.health` |
| Name | Morning run | `name` |
| Goal, as a sentence | 3× a week for 4 weeks | `target_count`, `interval_*`, `num_periods` |
| Dates, first and last day | Oct 27 – Nov 23 (year only when it is not this year) | `start_date`, `stats.current_period.end` minus one day |
| Level reached | Gold, Silver, Bronze or No badge, as a pill in the tier color. No badge is dashed and muted, as on the Dashboard | `stats.badge` |
| Final progress | 100% | `stats.final_progress` |
| Consistency, as periods met | 4/4 (with the percentage in the accessible name) | `stats.final_consistency` plus period count (see 7) |
| Total activities | 13 | new, see 7 |
| Best streak | 4 weeks | new, see 7 |

Left out of the row, because Habit Details has them: the description, the calendar, the activity log and the period list. A row with no badge gets no extra text. The Dashboard's encouraging note stays in the summary card instead ("2 ended below 60%. Every attempt counts.").

The level is the per-habit result from rule 8.9, which is not an achievement badge. It uses the tier pill colors but never the medal shape, so it is not mistaken for an achievement.

## 6. How much fits on one page

- A row is about 88px on a laptop (three lines), so 7 or 8 rows fit under the summary on a 900px screen. That is enough to compare a month's habits at a glance.
- Load **20 at a time** with **Show more**, which uses `limit` and `offset` on the list endpoint. Most users will never press it. Infinite scroll is not used, because the footer and the browser's back position matter more than saving a click.
- The filter and sort go in the URL (`/history?level=gold&sort=best`), so back from Habit Details returns to the same view. TanStack Query keeps loaded pages, so the scroll position survives.
- On a phone (below 52rem) each row is two blocks: the plant, name and level pill, then the four numbers in a 2 × 2 grid. Dates go under the name. About 5 rows fit. This is part of #381.

## 7. Data and API

`GET /habits?status=finished&limit=20&offset=n` already returns most of it. Two problems:

1. **Order.** The list is ordered by `created_at`. History wants most recently ended first. Add `sort=ended_desc|ended_asc|result` for `status=finished` (the backend already scans habit metadata before paging, so sorting by the calculated end date there is cheap).
2. **Missing numbers.** Add to the short `stats`, only once a habit has expired (null before):
   - `total_logs`: count of logs.
   - `best_streak`: the longest streak the habit ever had (the achievements engine already has `bestStreak` in `domain/achievements/facts.ts`; move it to `domain/` and share it).
   - `periods_met` and `periods_total`, for "4/4". `final_consistency` alone gives the rate but not the count.
3. **Summary.** Add `GET /habits/history/summary`, or add `history` to `GET /dashboard`: `{ finished, by_level: {gold, silver, bronze, none}, total_logs, average_final_progress }`. Rec: put it on the dashboard response, which already reads every habit and log, and have History read both. If that is too heavy, compute it from the first page plus `total` and drop the totals line.

Logs are already loaded for the page being returned, so `total_logs` and `best_streak` add no queries.

## 8. Changes to other screens

- **Dashboard:** show the 3 most recent finished habits instead of all, with **See all finished habits** linking to `/history`. Keeps the Dashboard about the present.
- **Garden, Completed garden:** keep the shelves (they are the garden's look back), add the level marker from #252, and a **View history** link by the heading. If shelves get long, show the latest 6 and let the link cover the rest. Decision 4.
- **Habit Details for a finished habit:** a small banner under the header: the level pill and "Ended Nov 23". "← Garden" becomes "← History" when the user came from History (read from a `from=history` query).
- **Badges:** the tab bar above the summary card. Nothing else changes.
- **badges-book.md K1 to K5:** replaced by this plan.

## 9. States

- **Loading:** the summary card and three row-shaped placeholders.
- **Error:** the usual card with "Couldn't load your history" and **Try again**.
- **Empty (no finished habits):** one card: "Habits you finish will appear here, with how they went. Your first one ends Dec 4." (the nearest end date among active habits, when there is one), and a link to the Garden.
- **Filter with no matches:** "No Gold habits yet." with a **Show all** button.
- **Deleted habit:** gone from History (its logs are gone too). Its achievement badges stay, as before.

## 10. Build order

| # | Step | Area | Size |
| --- | --- | --- | --- |
| 1 | `sort` for finished habits, and `total_logs`, `best_streak`, `periods_met`, `periods_total` on expired short stats. Move `bestStreak` to `domain/` | backend | S |
| 2 | History summary on `GET /dashboard` | backend | S |
| 3 | `/history` page: summary, list with month headings, Show more, empty, loading and error states, tests | frontend | M |
| 4 | Badges / History tab bar on both pages, and the nav item current on both | frontend | S |
| 5 | Filters and sort in the URL | frontend | S |
| 6 | Dashboard capped at 3 with the link, Garden link, Habit Details finished banner and back link | frontend | S |
| 7 | Docs: screens.md section 6, backend design 6.4 and 6.5, close K in badges-book.md | docs | S |
| Later | Finished shared habits in History with a Shared pill and the member's own result (#342). Phone layout (#381) | both | M |

Steps 1 to 4 are the minimum for #254.

## 11. Decisions to confirm

1. History is its own route, reached by a tab on Badges, with no navbar button (section 3).
2. Drop the "Finished habits" chapter (K1) from the badge book.
3. Rows link to Habit Details rather than opening a quick-look dialog.
4. Cap the Dashboard's finished list at 3, and maybe the Completed garden at 6.
5. Summary numbers come from `GET /dashboard` (section 7).
6. Shared finished habits wait for #342.
