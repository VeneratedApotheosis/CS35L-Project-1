# Habit Garden: Badge Ideas

A working list, not a spec. **Decided:** earned badges are permanent, badges that need new tracking are dropped, and only self-earned badges are in scope for now. Nothing here is built yet.

The badges the app has today are the per-habit **Bronze, Silver and Gold** results (see [backend design 8.9](backend/design.md#89-completion-and-badges)). This list is a second layer on top of them: **achievements** for the whole account, modelled on video game trophies. Some are easy and pop up in the first minutes, some take weeks, and some stay hidden until you earn them.

## Contents

- [How to read this list](#how-to-read-this-list)
- [Rarity tiers](#rarity-tiers)
- [1. Getting started](#1-getting-started)
- [2. Logging milestones](#2-logging-milestones)
- [3. Habit completion](#3-habit-completion)
- [4. Streaks and consistency](#4-streaks-and-consistency)
- [5. Garden and plants](#5-garden-and-plants)
- [6. Comebacks and recovery](#6-comebacks-and-recovery)
- [7. Shared habits (later)](#7-shared-habits-later)
- [8. Hard (challenge) badges](#8-hard-challenge-badges)
- [9. Secret badges](#9-secret-badges)
- [10. Meta badges](#10-meta-badges)
- [Design notes and decisions](#design-notes-and-decisions)

---

## How to read this list

| Column | Meaning |
| --- | --- |
| **Name** | The title shown on the badge. Keep it short and playful |
| **How to earn it** | The unlock condition, in plain words |
| **Tier** | Rarity, see below |

**Secret** badges (section 9) are not shown anywhere until earned: not as locked, not as in progress, and not counted ahead of time. Once earned they appear with their own pink starburst medal and a "Secret" label, next to their tier.

Every condition can be worked out from what the app already stores: habits, activity logs (with the date each happened) and the user's timezone. No new tracking is needed. The one new piece of storage is a record of which badges a user has earned, because earned badges are permanent (see the notes at the end).

## Rarity tiers

Borrowed from game trophy systems.

| Tier | Feel | Typical effort |
| --- | --- | --- |
| **Bronze** | Easy, comes from normal use | First day to first week |
| **Silver** | Takes some commitment | A few weeks |
| **Gold** | Hard, a real accomplishment | Months, or a lot of discipline |
| **Platinum** | Rare, for the dedicated | Near-perfect runs or finishing the list |
| **Secret** | Not visible at all until earned. Any tier, shown with a special starburst medal | Varies, often by accident or curiosity |

---

## 1. Getting started

Easy wins that teach the app.

| Name | How to earn it | Tier |
| --- | --- | --- |
| **Seed Money** | Create your first habit | Bronze |
| **First Drop of Water** | Log your first activity | Bronze |
| **Green Thumb** | Reach plant stage 2 on any habit | Bronze |
| **Sapling Season** | Reach plant stage 3 on any habit | Bronze |
| **Full Bloom** | Reach plant stage 4 on any habit | Bronze |
| **Backdated** | Log an activity for an earlier day in the current period | Bronze |
| **Personal Touch** | Set your display name | Bronze |
| **Roots Down** | Have 3 active habits at once | Bronze |

## 2. Logging milestones

Counted over your whole account, all habits together.

| Name | How to earn it | Tier |
| --- | --- | --- |
| **Ten Taps** | Log 10 activities in total | Bronze |
| **Fifty Strong** | Log 50 activities in total | Bronze |
| **Century Club** | Log 100 activities in total | Silver |
| **Five Hundred Fold** | Log 500 activities in total | Gold |
| **Thousand-Petal Rose** | Log 1,000 activities in total | Platinum |
| **Overachiever** | Log more than the target in a single period (for example 6/3) | Bronze |
| **Double Time** | Log at least twice the target in a single period | Silver |
| **Busy Day** | Log 5 activities on the same day | Silver |
| **Every Hand on Deck** | Log on 3 different habits in one day | Bronze |
| **Full Garden Day** | Log every active habit in one day (at least 4 active habits) | Silver |

## 3. Habit completion

Based on finished habits. Bronze, Silver and Gold habit results still exist; these count them.

| Name | How to earn it | Tier |
| --- | --- | --- |
| **First Harvest** | Finish your first habit with any badge | Bronze |
| **Ten Harvests** | Finish 10 habits with any badge | Silver |
| **Twenty-Five Crop Rotations** | Finish 25 habits with any badge | Gold |
| **Gold Standard** | Earn a Gold on a habit | Silver |
| **Triple Gold** | Earn Gold on 3 habits | Gold |
| **Gold Rush** | Earn Gold on 10 habits | Platinum |
| **Perfect Score** | Finish a habit at 100% progress and 100% consistency | Gold |
| **Long Game** | Finish a habit that ran 12 or more periods | Silver |
| **Marathon Gardener** | Finish a habit that ran 52 or more periods | Gold |
| **Jack of All Trades** | Finish habits with 3 different plant types | Silver |
| **Hat Trick** | Finish 3 habits in the same week | Silver |
| **Clean Sweep** | Every habit you finished in a calendar month earned Gold or Silver (at least 3) | Gold |

## 4. Streaks and consistency

A streak is consecutive successful periods on one habit (see [8.6](backend/design.md#86-streaks)).

| Name | How to earn it | Tier |
| --- | --- | --- |
| **Two in a Row** | Reach a streak of 2 | Bronze |
| **Habit Forming** | Reach a streak of 4 | Bronze |
| **Eight Is Great** | Reach a streak of 8 | Silver |
| **Quarter Year** | Reach a streak of 13 weeks on a weekly habit | Silver |
| **Half-Year Hero** | Reach a streak of 26 | Gold |
| **Evergreen** | Reach a streak of 52 | Platinum |
| **No Misses** | Finish a habit of 4 or more periods with 100% consistency | Silver |
| **Unbroken** | Have 3 habits with a streak of 4 or more at once | Silver |
| **Triple Threat Streak** | Have streaks of 8 or more on 3 habits at once | Gold |
| **Daily Devotion** | Log a daily habit 30 days in a row | Gold |
| **Weekend Warrior** | Meet a weekly goal using only Saturday and Sunday logs, 4 weeks in a row | Silver |

## 5. Garden and plants

Collecting, like a Pokédex. Plant types in the app: calathea, Kimberly Queen fern, lily, lotus, monstera, peace lily, philodendron, pilea, pothos, rose, snake plant, spider plant.

| Name | How to earn it | Tier |
| --- | --- | --- |
| **Variety Pack** | Grow 3 different plant types | Bronze |
| **Botanist** | Grow 6 different plant types | Silver |
| **Complete Collection** | Finish a habit with every plant type | Platinum |
| **Rose Garden** | Have 3 roses in your garden at once | Silver |
| **Jungle** | Have 10 active plants at once | Gold |
| **Greenhouse** | Have 6 plants at stage 4 at once | Gold |
| **Prize Winner** | Have a plant at stage 4 and Healthy for 4 periods straight | Silver |
| **Matching Set** | Have 3 habits using the same plant type | Bronze |
| **Shelf Full** | Fill a shelf (3 plants side by side) | Bronze |
| **Second Floor** | Need a second shelf in your garden | Bronze |
| **Hall of Fame** | Have 5 finished habits on the Completed garden shelves | Silver |

## 6. Comebacks and recovery

Rewards for failing and getting back up. These make a missed week feel less final.

| Name | How to earn it | Tier |
| --- | --- | --- |
| **Wilted but Not Dead** | Have a plant reach Wilted health and recover to Healthy | Bronze |
| **Second Wind** | Meet your goal the period right after missing one | Bronze |
| **Phoenix Plant** | Recover a Wilted plant to Healthy and finish the habit with a Silver or Gold | Silver |
| **Bounce Back** | Meet a goal 3 periods in a row right after a miss | Silver |
| **Welcome Back** | Log an activity after 14 or more days with no logs at all | Silver |
| **Clutch** | Meet a period's target on the last day of that period | Bronze |
| **Down to the Wire** | Meet the final period's target on the habit's last day to reach 100% | Silver |
| **Resurrection** | Reach Gold on a habit that was Wilted at some point | Gold |

## 7. Shared habits (later)

Out of scope for now. We are building self-earned badges first, and the main design has not decided on group badges. Ideas for later: **Better Together** (join a shared habit), **Seed Planter** (create one), **Team Player** (finish one), **Co-op Gold** (Gold on a shared habit), **Recruiter** (3 people join yours).

## 8. Hard (challenge) badges

The "Gold and Platinum" end of the list. These need months of effort, or a lot of everything at once.

| Name | How to earn it | Tier |
| --- | --- | --- |
| **Iron Routine** | Finish 3 habits at 100% consistency | Gold |
| **Perfect Year** | Log something on at least one habit every day for 365 days | Platinum |
| **The Hundred Days** | Log something every day for 100 days | Gold |
| **Quit Quitting** | Finish 5 habits that each ran at least 8 periods | Gold |
| **Everything Everywhere** | Keep 5 active habits all Healthy for 8 weeks | Gold |
| **Grandmaster Gardener** | Earn Gold on 25 habits | Platinum |
| **Four Seasons** | Finish a habit in each of the four seasons of a year | Gold |
| **Year in Bloom** | Finish a habit that ran a full year (by months or weeks) | Gold |
| **Untouchable** | Go a full year with no Wilted plants | Platinum |
| **Triple Crown** | Earn a Gold on a daily, a weekly and a monthly habit | Gold |

## 9. Secret badges

Not visible anywhere until earned: they are not listed as locked or in progress, and the app does not say how many exist. Once earned they show with the special pink starburst medal. Some are jokes, some reward curiosity, some reward odd behaviour. Spoilers below.

| Name | How to earn it | Tier |
| --- | --- | --- |
| **Early Bird** | Log an activity before 6 AM, your local time | Bronze |
| **Night Owl** | Log an activity between midnight and 4 AM | Bronze |
| **Midnight Gardener** | Log exactly at 00:00 to 00:05 | Silver |
| **New Year, New Me** | Create a habit on January 1st | Silver |
| **Leap of Faith** | Log an activity on February 29th | Gold |
| **Lucky Seven** | Log 7 activities in one day | Silver |
| **Procrastinator** | Log 5 backdated activities in a single day | Silver |
| **Nice** | Log your 69th activity | Bronze |
| **Blaze It** | Log your 420th activity | Bronze |
| **Over 9000** | Log 9,001 activities in total | Platinum |
| **Sunday Best** | Finish a habit on a Sunday | Bronze |
| **Friday the 13th** | Log an activity on a Friday the 13th | Silver |
| **Overgrown** | Have 12 active habits at once | Gold |
| **Zen Master** | Open the app and do nothing: log nothing for a full month, then log again | Silver |
| **The Long Wait** | Create a habit that starts 6 or more months in the future | Silver |
| **Fashionably Late** | Join a shared habit on its last day | Bronze |
| **100%** | Earn every badge, secret ones too | Platinum |

## 10. Meta badges

For earning badges themselves, like a game's trophy-count milestones.

| Name | How to earn it | Tier |
| --- | --- | --- |
| **Trophy Case** | Earn 5 badges | Bronze |
| **Shelf of Honours** | Earn 15 badges | Silver |
| **Hall of Plants** | Earn 30 badges | Gold |
| **Secret Keeper** | Find 3 secret badges | Silver |
| **Truffle Pig** | Find 10 secret badges | Gold |
| **Completionist** | Earn every non-secret badge | Platinum |

---

## Design notes and decisions

- **Scope.** Self-earned badges only. Shared habit badges wait until after the project due date (Dec 1).
- **Permanent.** An earned badge is never taken away, even if the log or habit behind it is later deleted. We store one row per earned badge (`user_id`, `badge_id`, `earned_at`) in a new table. The badge list and the rules stay in code, so only the fact "this user earned this badge on this day" is stored.
- **When to check.** Right after a log is added, and when a habit expires. The backend evaluates every badge's rule, inserts any new ones and returns them so the app can show the "Badge earned" moment.
- **No new tracking.** Every badge here is worked out from what the app already stores: habits, logs (with `occurred_on` and the time logged), the profile and its timezone. Ideas that needed extra tracking (undo counts, screen opens, hovers, theme changes, deleted-habit history, birthdays) were dropped.
- **Gaming the system** (such as logging many times in one day) is not handled for now.
- **Names are drafts.** Plant and gardening puns carry the theme and can be reworked.
- **Counts are guesses.** Thresholds follow game convention. Check them against how much a real user logs, so Bronze comes quickly and Gold takes real effort.
- **Time-of-day badges** use the user's timezone from their profile, like the period rules.
- **Completionist** (every non-secret badge, section 10) and **100%** (every badge including secret ones, section 9) are the two top-level "platinum trophy" badges.
- **Art.** One medal per tier with an icon in the middle (no plants). In-progress badges show a progress ring instead of a solid medal. Secret badges get a special pink starburst medal. See the Badges section of the style guide (`/style-guide`).
