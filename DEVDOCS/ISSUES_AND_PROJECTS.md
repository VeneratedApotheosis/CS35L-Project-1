# Project Board and Issues

How we track work. Part of the [Developer Guide](DEVELOPER.md).

The full GitHub setup (settings, rules, Actions) is in `project/github_ticketing_system.md`. This file is the practical guide for using it.

---

## Purpose

Read this file to learn how the project board, statuses, labels, hierarchy and milestones fit together, and how to pick up, create, block and close issues.

## What's in this file

- [1. The GitHub Project board](#1-the-github-project-board)
  - [1.1 What it is](#11-what-it-is)
  - [1.2 Status values](#12-status-values)
  - [1.3 Labels](#13-labels)
  - [1.4 Hierarchy: epics, tasks and sub-tasks](#14-hierarchy-epics-tasks-and-sub-tasks)
  - [1.5 Milestones](#15-milestones)
  - [1.6 Views](#16-views)
  - [1.7 Day to day](#17-day-to-day)
  - [1.8 Automation](#18-automation)
  - [1.9 PRs on the board](#19-prs-on-the-board)
- [2. Working with issues](#2-working-with-issues)
  - [2.1 What a good issue has](#21-what-a-good-issue-has)
  - [2.2 Picking up work](#22-picking-up-work)
  - [2.3 Creating an issue](#23-creating-an-issue)
  - [2.4 Triage](#24-triage)
  - [2.5 Adding a sub-issue](#25-adding-a-sub-issue)
  - [2.6 Reporting a bug](#26-reporting-a-bug)
  - [2.7 Blocked work](#27-blocked-work)
  - [2.8 Done-when checkboxes](#28-done-when-checkboxes)
  - [2.9 Closing](#29-closing)
- [3. Finding things (filters)](#3-finding-things-filters)

---

## 1. The GitHub Project board

We use the board to view and manage our issues. Read this section top to bottom. Each part builds on the one before.

### 1.1 What it is

The repo already has issues and PRs. A **Project** is a separate planning board that *displays* the issues in one place and adds fields they don't have, like Status. 

- it organizes the view, so that it isn't like all cooked and in one page like for the issues page, i really odn't suggest viewing issues exclusively thru the issues page
- See what's open, who has what and what stage it's at: use the board.
- A card is a **project item** that points at a real issue. Changing its Status changes only the board's field, not the issue. If the issue closes, the card stays and shows as closed.
- You never *need* the board to contribute. It's the team's dashboard.

**Where:** https://github.com/users/VeneratedApotheosis/projects/2 (linked to the repo's Projects tab). Access is separate from repo access. The owner invites you at project > ... > Settings > Manage access, and you may need to accept. Repo access alone doesn't let you edit the board.


### 1.2 Status values

Status is the column an issue sits in. It answers: **where is this in its life?**

| Status | Meaning |
|---|---|
| Backlog | Not planned for now |
| Todo | Ready to be picked up |
| In Progress | Someone is working on it |
| In Review | PR is open and the author wants a review |
| Done | Merged and closed |

New issues arrive in **Backlog**. The author moves them to **Todo** when they're ready.
Status lives on the board, **not in labels**. Don't make labels like `in-progress`.
### 1.3 Labels

Labels tells u: **what is this, and which part of the project is it about?** They come in two groups, both prefixed so they sort together.

**Rules**
- if we ever need new labels we can add
- Every issue has **exactly one** `type:` label.
- Every issue has **at least one** `area:` label.
- There are no priority labels, no `blocked` label and no status labels. Milestones and the board handle those jobs.
	- if an issue is blocked it is natively supported on the issues page, u can indicate its blocked by another issue

**Type labels** (what kind of work)

| Label | Use | Usual commit type |
|---|---|---|
| `type: epic` | Parent tracking issue for a phase. Not worked on directly | n/a |
| `type: feature` | New user-facing functionality | `feat` |
| `type: bug` | Something is broken | `fix` |
| `type: refactor` | Restructure code without changing behavior | `refactor` (or `perf`) |
| `type: test` | Add or fix tests | `test` |
| `type: docs` | Documentation, design docs, wireframes | `docs` |
| `type: chore` | Setup, config, tooling, everything else | `chore` (or `build`, `ops`, `style`) |

`style`, `build`, `ops` and `perf` commits rarely deserve their own ticket, so they don't have their own labels. They fall under `chore` or `refactor`.

**Area labels** (which part of the project)

| Label | Use |
|---|---|
| `area: frontend` | The React app |
| `area: backend` | The Node.js server |
| `area: database` | Supabase / PostgreSQL |
| `area: auth` | Supabase Auth |
| `area: design` | UI/UX, wireframes, habit rules, planning |
| `area: repo` | Repo config, conventions, team workflow |

The area names are also the optional **scopes** in commit and PR titles, e.g. `feat(frontend): ...`.

**Example.** "Scaffold React + TypeScript app with Vite" is `type: chore` and `area: frontend`.

**Using them on the board.** Add the **Labels** column to a table view to see them. Filter with `label:"area: auth"`.


### 1.4 Hierarchy: epics, tasks and sub-tasks

Issues are organized in **three levels**, linked as native GitHub **sub-issues**. A parent shows a progress bar of how many children are closed.

```
Epic        "Epic: Week 1 - Setup"
 ├── Task       "Frontend foundation"
 │    ├── Sub-task   "Scaffold React + TypeScript app with Vite"
 │    ├── Sub-task   "Choose styling approach, define design tokens and light/dark theme"
 │    └── Sub-task   "Build base components and a style guide page"
 ├── Task       "Backend foundation"
 │    └── ...
 └── ... (6 tasks)
```

| Level | What it is | Size | Closed when |
|---|---|---|---|
| **Epic** | One per week or phase. Everything for that phase hangs under it | Large | All its tasks are closed |
| **Task** | A deliverable for one area, e.g. "Frontend foundation" | Medium | All its sub-tasks are closed |
| **Sub-task** | A concrete step small enough for **one PR** | Small | Its PR merges |

**Rules**
- **Work on sub-tasks.** Epics and tasks are containers. They don't get branches or PRs of their own.
- **Three levels max.** Don't nest deeper.
- **No label tells a task from a sub-task.** They share the same `type:` labels. The hierarchy itself is the difference.

**How to see the hierarchy**
- The **Hierarchy** view on the board groups issues by parent (see 1.6).
- Open a parent issue to see its children as a nested list with a progress bar.
- Search with the parent filter (see section 3).

**Right now:** epic #39 "Epic: Week 1 - Setup" has six tasks: Repo and team workflow (#40), Frontend foundation (#46), Backend foundation (#50), Supabase and authentication (#53), Database and edge functions (#60) and Design and planning (#64). Each has its sub-tasks. Setup work for GitHub itself goes under "Repo and team workflow".


### 1.5 Milestones

Milestones answer: **which phase of the timeline is this for?** They match the schedule in `project/plan.md`.

- `Setup (Oct 22-30)`
- `Milestone 1 (Oct 30-Nov 6)`
- `Visualization (Nov 7-13)`
- `Milestone 2 (Nov 14-20)`
- `Social Features (Nov 21-27)`
- `Testing (Nov 28-Dec 4)`

**Rules**
- Every issue gets **exactly one** milestone.
- Create each milestone when its phase starts, not months ahead. Close it when all its issues are closed.
- On the board, the **By milestone** view groups issues by it.

**Putting it together:** status says *where it is*, type says *what kind*, area says *which part*, milestone says *when*, and the hierarchy says *what it belongs to*.


### 1.6 Views

A **view** is a saved way of showing the same issues (a tab at the top). Views change what you see, not the data.

| View         | Layout | Shows                                                                |
| ------------ | ------ | -------------------------------------------------------------------- |
| Board        | Board  | Issues in columns by Status                                          |
| By milestone | Table  | Issues grouped by milestone                                          |
| Hierarchy    | Table  | Issues grouped by parent, so sub-tasks sit under their task and epic |

**Grouping** splits rows into collapsible sections, one per value of a field (e.g. one section per milestone). It doesn't change any data.

Create a view with **+ New view** next to the tabs, pick the layout, then use Group by, Filter and Sort.


### 1.7 Day to day

1. Open the board and pick an issue from **Todo**. Pick a sub-task.
2. Assign yourself and move it to **In Progress**.
3. Do the work (see [CONTRIBUTOR.md](CONTRIBUTOR.md)).
4. When you open the PR, move the issue to **In Review** if you want a review. If you don't need one, skip it.
5. When the PR merges, the issue closes and moves to **Done** by itself (see 1.8).

Anyone can add an item: click **Add item** at the bottom of a column, type `#` and search for an issue, or create a new issue right there.


### 1.8 Automation

Project > ... > **Workflows** has simple if-this-then-that rules that update the board for you:

- **Auto-add:** new repo issues are added to the project (filter `is:issue is:open`).
- **Item added to project:** sets Status to Backlog (we changed this from the default).
- **Item closed** and **Pull request merged:** set Status to Done.

The repo rules (squash only, branch protection, auto-delete branches, Actions) are in `project/github_ticketing_system.md`.


### 1.9 PRs on the board

Only **issues** are cards. A PR is not its own card.

- To see an issue's PR on its row, add the **Linked pull requests** column (view menu > Fields). A PR is linked when its description has `Closes #n`.
- Keep the auto-add filter as `is:issue is:open` so PRs aren't added. As a safety net, filter each view with `is:issue`.

---

## 2. Working with issues

Section 1 explained the pieces. This section is how to use them on a real issue.

### 2.1 What a good issue has

| Part | What to put |
|---|---|
| **Title** | Starts with a verb, short. No ID prefixes like `R1:` |
| **Description** | What and why, in a few lines |
| **Done when** | A checklist of what must be true to call it finished |
| **Type label** | Exactly one (see 1.3) |
| **Area label(s)** | At least one (see 1.3) |
| **Milestone** | Exactly one (see 1.5) |
| **Parent** | The task it belongs to, as a sub-issue (see 2.5) |
| **Assignee** | Left empty until someone picks it up |

The issue templates (Task and Bug report) pre-fill the headings. They don't set the labels, milestone or parent, so add those yourself.


### 2.2 Picking up work

1. Find an issue on the board (section 1) or the Issues tab (filter by label or milestone).
2. Pick a **sub-task**. Epics and tasks are containers.
3. Check it's unassigned and that anything it depends on is done.
4. **Assign yourself** before you start so nobody duplicates it.


### 2.3 Creating an issue

- Open **Issues > New issue** and choose a template.
- Fill in every part from 2.1. If it belongs to a bigger task, add it as a sub-issue (2.5).
- No issue for the work you're about to do? Create one first, unless it's a small change (typo, comment, formatting, small docs or config tweak). Those can go straight to a PR with `none` under Issues.


### 2.4 Triage

- No triage meeting or routine. Whoever creates an issue triages it: sets the type, area and milestone, then moves it from Backlog to Todo when it's ready to be picked up.


### 2.5 Adding a sub-issue

1. Open the **parent** issue (the task).
2. In the **Sub-issues** section click **Add sub-issue**.
3. Choose **Create new sub-issue** or **Add existing issue** and pick it.
4. The child shows up nested under the parent, and the parent gets a progress bar.


### 2.6 Reporting a bug

- Use the Bug report template. It applies `type: bug`. Add the right `area:` and a milestone.
- Say what you did, what you expected and what happened.
- No special hotfix rule. A bug is a normal issue. If it's urgent, say so in the issue and move it to the top of Todo.


### 2.7 Blocked work

- If an issue waits on another issue, use GitHub's native relationship: open the waiting issue > **Relationships** (right sidebar) > **Mark as blocked by** > pick the blocker. Filter with `is:blocked` or `is:blocking`.
- If it waits on something that isn't an issue (access, an answer), make a small issue for that thing and mark it as the blocker, or say what it's waiting on in a comment.
- There's no `blocked` label.


### 2.8 Done-when checkboxes

- The `- [ ]` lines in an issue are a checklist. Click a box to tick it, or edit the text.
- Tick each one as you finish that piece. The issue list shows progress like "2 of 3".
- Closing an issue doesn't tick them, and ticking them all doesn't close it. They're a self-check before you open the PR.


### 2.9 Closing

- Issues close automatically when the PR that fixes them merges (see "Closing issues from a PR" in [CONTRIBUTOR.md](CONTRIBUTOR.md)). Don't close sub-tasks by hand unless there's no PR.
- Closing as **completed** means the work is done. Closing as **not planned** means it was dropped, a duplicate or no longer needed. Pick it in the close dropdown and leave a comment saying why.
- A parent task or epic does **not** close itself. Close it by hand after its last child closes.
- Forgot a `Closes`? See "Fixing process mistakes" in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## 3. Finding things (filters)

Paste these into the search box on the Issues tab.

| You want | Search |
|---|---|
| Only epics | `is:issue label:"type: epic"` |
| Only one type | `label:"type: feature"` |
| Only one area | `label:"area: frontend"` |
| Blocked issues | `is:issue is:open is:blocked` |
| Top-level issues (no parent) | `is:issue no:parent-issue` |
| Tasks only (children of the epic) | `is:issue parent-issue:VeneratedApotheosis/CS35L-Project-1#39` |
| Sub-tasks of one task | `is:issue parent-issue:VeneratedApotheosis/CS35L-Project-1#40` (change the number) |

The `parent-issue:` filter lists only the sub-issues of the issue you name. Tasks and sub-tasks share the same `type:` labels, so that filter (or the Hierarchy view) is how you separate them. Combine filters freely, e.g. `label:"area: auth" is:open`.