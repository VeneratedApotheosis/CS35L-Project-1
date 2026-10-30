# Developer Guide

Start here.

- This is how to contribute: the procedures, conventions and definitions you need to follow.
- For what the project is, the design, the feature list and the timeline/milestones, read `project/plan.md`.
- Anything marked **TBD** hasn't been decided yet. Ask the group chat if you have questions.
- This is the first time I'm doing these things, so I'm figuring it out as I go. These are the comprehensive procedures and documentation I've listed for how to contribute and develop here.

---

## Purpose

Read this file to understand why we use this process, how the pieces fit together, and which guide to read next.

## What's in this file

- [1. Why this exists](#1-why-this-exists)
- [2. The systems at a glance](#2-the-systems-at-a-glance)
- [3. Read below in order](#3-read-below-in-order)
- [4. How a change flows](#4-how-a-change-flows)
- [5. The guides](#5-the-guides)
- [6. Project structure](#6-project-structure)
- [7. Definitions](#7-definitions)
  - [7.1 Tickets (issues, hierarchy and labels)](#71-tickets-issues-hierarchy-and-labels)
  - [7.2 Other terms](#72-other-terms)
  - [7.3 Git glossary](#73-git-glossary)
- [8. Links](#8-links)

---

## 1. Why this exists

- TS system of working is like lowkey complex so u might need this to know stuff
- stuff to remember are:
	- **Ticketing**: GH Projects, GH Projects Hiearchy, Labels, Assigning, Closing
	- **Branches and PRs**: pushing to main is like literally illegal (i made a rule), u need to do this
	- **Naming rules**: there are some checks to enforce this. Conventional commits, PR names, PR Descriptions
- None of this is hard, but it is a lot at once. That's why it's split into short guides. You don't need to memorize them. You need to know where to look.

---

## 2. The systems at a glance

- **GitHub Issues:** tickets board, use these to open PRs and take work you wanna do. but don't actually use this page, because its hard to at, use (read below)
- **GitHub Project board:** use this to view and manage the ticketing system. See status and who has what.
- **Contribution:** how code gets into `main`. Open issues, make branches and PRs, follow the naming rules.
- **Commit conventions:** one format for PR titles and commits, so history is readable.
- **Repo rules and automation:** guardrails that run on their own. Branch protection, squash-only merging, auto-closing issues, the PR title check.
- **Support docs:** [UNDOING.md](UNDOING.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for mistakes, [ONBOARDING.md](ONBOARDING.md) for setup, `project/plan.md` for what we're building.

---

## 3. Read below in order

1. [ONBOARDING.md](ONBOARDING.md): get set up.
2. [ISSUES_AND_PROJECTS.md](ISSUES_AND_PROJECTS.md): how work is tracked.
3. [COMMITS.md](COMMITS.md): how to write commit and PR titles.
4. [CONTRIBUTOR.md](CONTRIBUTOR.md): **read this last.** It assumes you know the three above.
5. Keep [UNDOING.md](UNDOING.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for when something goes wrong.

---

## 4. How a change flows

1. An **issue** exists, on the board.
2. You assign yourself and move it to **In Progress** or just finish it and mark it as done if you're lazy.
3. You make a **branch** named after the issue number.
4. You commit and push your work.
5. You open a **PR** with a Conventional Commits title and `Closes #n`. The PR title check runs.
6. Optionally you ask for a **review** and move the issue to **In Review**.
7. You **squash merge**. GitHub closes the issue, the board moves it to **Done**, and the remote branch is deleted.
8. You delete your **local** branch and pick the next issue.

**Small changes** (typos, comments, formatting, small docs or config tweaks) don't need an issue. Skip steps 1 and 2, name the branch without a number, and write 
one under Issues in the PR. Everything else follows the steps above.

---

## 5. The guides

| File | What's in it |
|---|---|
| [ONBOARDING.md](ONBOARDING.md) | Checklist for joining: invites, tools, first issue |
| [ISSUES_AND_PROJECTS.md](ISSUES_AND_PROJECTS.md) | Picking up and creating issues, the project board, filtering |
| [COMMITS.md](COMMITS.md) | The rules you need to follow when making commits |
| [CONTRIBUTOR.md](CONTRIBUTOR.md) | Lets say you want to write some code, this is how to contribute. The step-by-step workflow from issue to merged PR, rules, reference |
| [UNDOING.md](UNDOING.md) | How to undo things in git: unstage, amend, revert, reflog |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Merge conflicts, a committed secret, Windows/PowerShell notes, fixing process mistakes |
| `project/github_ticketing_system.md` | How we use GitHub: hierarchy, labels, milestones, the project board, repo rules, Actions |
| `project/plan.md` | Project design, feature list, timeline |

---

## 6. Project structure

- One monorepo. Frontend and backend are completely isolated.
  - `frontend/`: React app (React + TBD)
  - `backend/`: Node.js server (Node.js + TBD)
- **Database and auth:** Supabase.

---

## 7. Definitions

### 7.1 Tickets (issues, hierarchy and labels)

- Anything ticket related is defined in **`project/github_ticketing_system.md`**. Read that first. It covers:
  - Epics, tasks, sub-tasks and sub-issues
  - Labels and milestones
  - The project board
  - Repo settings and Actions
- Quick version: work on **sub-tasks**. Epics and tasks are just containers.


### 7.2 Other terms

| Term | Meaning |
|---|---|
| **F1-F12** | Feature IDs from the feature list in `project/plan.md`. |
| **Conventional Commits** | The commit message format we use. See [COMMITS.md](COMMITS.md). |
| **Scope** | The part of the project a commit touches. Same names as the area labels. Optional. |
| **PR** | Pull request. How all changes get into `main`. |


### 7.3 Git glossary

| Term | Meaning |
|---|---|
| **repo** | The project folder tracked by git, plus its history. |
| **commit** | A saved snapshot of your changes with a message. |
| **branch** | A separate line of commits, so work doesn't touch `main` until it's merged. |
| **remote / origin** | The copy of the repo on GitHub. `origin` is its default name. |
| **clone** | Download a copy of the repo to your computer. |
| **fetch** | Download new commits from GitHub without changing your files. |
| **pull** | Fetch, then merge the new commits into your current branch. |
| **push** | Upload your commits to GitHub. |
| **merge** | Combine one branch's commits into another. |
| **conflict** | Two changes touch the same lines, so git asks you to choose. |
| **HEAD** | The commit you're currently on. |
| **revert** | Make a new commit that undoes an older one. |
| **fork** | Your own copy of someone else's repo. We use branches in one repo, not forks. |

---

## 8. Links

- Repo: https://github.com/VeneratedApotheosis/CS35L-Project-1
- Repo invitations (accept your invite here): https://github.com/VeneratedApotheosis/CS35L-Project-1/invitations
- Project board (a 404 means you have no access yet): https://github.com/users/VeneratedApotheosis/projects/2
- Conventional Commits spec: https://www.conventionalcommits.org/
- Commit cheat sheet we follow: https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13
- GitHub docs (search these titles at https://docs.github.com): "About issues", "Managing labels", "About milestones", "Adding sub-issues", "Linking a pull request to an issue"
- Project plan, design, feature list and timeline: `project/plan.md`