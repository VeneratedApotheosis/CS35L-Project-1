# Habit Garden: Screens

What each screen shows and does. For the rules behind the numbers, see [the backend design](../backend/design.md#8-calculation-rules). For how the screens look, see [the frontend design](design.md). For the big picture, see [design.md](../design.md).

Group habits are not part of this version, so no screen shows them.

---

## Contents

- [Screens](#screens)
  - [1. Login](#1-login)
  - [2. Garden (home)](#2-garden-home)
  - [3. Overall Dashboard](#3-overall-dashboard)
  - [4. Habit Details](#4-habit-details)
  - [5. Create Habit](#5-create-habit)
  - [6. Badges and Habit History](#6-badges-and-habit-history)
  - [7. Settings](#7-settings)

---
## Screens

```mermaid
flowchart LR
    Login --> Garden
    Garden <--> Dashboard[Overall Dashboard]
    Garden <--> Badges[Badges & History]
    Garden <--> Settings
    Garden --> Create[Create Habit]
    Garden --> Details[Habit Details]
    Dashboard --> Details
    Create --> Details
    Badges --> BadgeDetails[Badge Details]
```

Every main screen links to the others through the navigation bar.

### 1 Login

- App name, logo, short description, and **Sign in with Google**.
- A profile is created automatically on first sign-in.
- After login, users land on the Garden (empty for new users).
- Every other page requires a session. Sessions persist across refreshes until logout or expiry.

### 2 Garden (home)

All active habits shown as potted plants in a grid.

- Each plant shows its **name**, a **current period progress bar**, and its **appearance** (growth stage + health).
- **Click** a plant to open Habit Details.
- **Press and hold** a plant to log an activity for today.
- Each plant's options menu: **Log activity**, **View details**, **Edit habit**.
- **Empty state:** an empty garden prompting the user to create their first habit.
- **Nav:** Overall Dashboard, Badges, Settings, Add Habit.

### 3 Overall Dashboard

A summary of activity across all active habits.

- **Active habits:** count of habits currently tracked.
- **Overall consistency:** average consistency across active habits ([rule 8.5](../backend/design.md#85-overall-consistency)). Shows "—" if no habit has finished a period yet.
- **Habit list.** Each row shows:
  - Habit name
  - Current period progress (e.g., 2/3 this week)
  - Streak (e.g., 3 weeks)
  - Remaining duration
  - Mini calendar: green on days with logs, gray otherwise. Missed goals are shown per period, not per day.
- Clicking a habit opens Habit Details.
- **Nav:** My Garden, Badges, Settings.

### 4 Habit Details

**Info:** name, description, plant type, goal (e.g., 3 times every week), start and end dates, remaining duration.

**Progress:**

| Metric | Shows | Rule |
| --- | --- | --- |
| Current period | Count toward target (e.g., 2/3), progress bar with tick marks | [8.2](../backend/design.md#82-current-period-progress) |
| Overall progress | % of total target, capped at 100% (circular indicator) | [8.3](../backend/design.md#83-overall-progress) |
| Consistency | % of completed periods where the target was met | [8.4](../backend/design.md#84-consistency) |
| Current streak | Consecutive successful periods, counting the current one once its target is met | [8.6](../backend/design.md#86-streaks) |

**Activity history:** calendar of logged dates, plus a per-period breakdown with each completed period's count and whether its goal was met. Logs in the current period show a delete button.

**Plant:** growth stage ([8.7](../backend/design.md#87-plant-growth)) combined with health ([8.8](../backend/design.md#88-plant-health)).

**Actions:**

- **Log activity.** A date picker defaults to today and allows any date in the current period up to today.
- **Undo** toast for about 5 seconds after logging.
- **Delete a log** from the current period.
- **Edit habit:** name, description, and plant type only. Goal, period, and duration are locked after creation.
- **Delete habit** (with confirmation). Removes the habit and its logs.

### 5 Create Habit

| Field | Details |
| --- | --- |
| Name | Required, 1–100 characters |
| Description | Optional, up to 500 characters |
| Goal | Target count per period (1–50) + recurring period: interval (1–365) and unit (days, weeks, or months). E.g., 3 times every 1 week. |
| Duration | Number of periods (1–52, required). The calculated end date is shown. |
| Start date | Today or later. Left at the default, it is omitted from the request and the backend uses today in the user's profile timezone (the confirm step shows "Today"). A past date is rejected. |
| Plant | Choose one of three plant types (pothos, peace lily, pilea), with a preview. Plants start at stage 1. |

- **Goal preview:** a sentence summarizing the setup, e.g., "Go to the gym 3 times every week for 4 weeks."
- **Confirm step:** before saving, a summary of the goal that says it can't be edited later. To fix a mistake, delete the habit and create it again.
- **Validation errors** are shown inline. If saving fails, an error message is shown.
- **After creation:** redirect to the Garden until the Details page exists, then to the new habit's Details page. **Cancel** returns to the Garden.

### 6 Badges and Habit History

- **Badge grid:** at most one badge per habit. Each shows the habit name, plant illustration, level (Bronze/Silver/Gold), and completion date.
- **Badge details:** goal and duration, final overall progress and consistency, total activities, final plant stage and health, level, completion date.
- **Habit history:** all expired habits, including those without badges, with final stats and activity history.
- **Empty state:** encouragement to keep growing habits.
- **Nav:** Overall Dashboard, My Garden, Settings.

### 7 Settings

- Username, email, and profile picture (from Google). Display name is editable, and saved through the backend.
- **Timezone:** defaults to the browser's on first sign-in, and can be changed here.
- Light/dark mode toggle, saved in the browser.
- Log out. Delete account, under Account, with a confirmation that lists what is deleted (habits, activity logs, badges).
- **Nav:** Overall Dashboard, My Garden, Badges.
