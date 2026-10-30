# Contributor Guide

Part of the [Developer Guide](DEVELOPER.md).

> **Read these first:** [ISSUES_AND_PROJECTS.md](ISSUES_AND_PROJECTS.md) and [COMMITS.md](COMMITS.md). This guide assumes you know them.

> **Command line is optional.** The commands here are one way to do it. Use VS Code, Xcode, GitHub Desktop or the GitHub website if you prefer, as long as the result is the same: your own branch, a Conventional Commits PR title, and `Closes #n` in the PR.

Anything marked **TBD** hasn't been decided yet. ASK the team if u got questions ty shii

---

## Purpose

Read this file to learn how to get a change into `main`, from picking an issue to cleaning up after the merge.

## What's in this file

- [1. The loop](#1-the-loop)
- [2. Step by step](#2-step-by-step)
  - [2.1 Pick an issue](#21-pick-an-issue)
  - [2.2 Branch](#22-branch)
  - [2.3 Do the work](#23-do-the-work)
  - [2.4 Push and open a PR](#24-push-and-open-a-pr)
  - [2.5 Review](#25-review-optional)
  - [2.6 Merge](#26-merge)
  - [2.7 Clean up](#27-clean-up)
- [3. Rules](#3-rules)
- [4. Reference](#4-reference)
  - [4.1 Closing issues from a PR](#41-closing-issues-from-a-pr)
  - [4.2 Handy gh commands](#42-handy-gh-commands)
  - [4.3 Renaming a branch](#43-renaming-a-branch)
  - [4.4 Renaming a PR](#44-renaming-a-pr)

---

## 1. The loop

```
pick issue -> assign yourself -> branch -> work -> push -> open PR -> (review) -> squash merge -> clean up
```

---

## 2. Step by step

### 2.1 Pick an issue

- Use the project board (it shows the hierarchy). Pick a **sub-task**. Epics and tasks are containers and finish when their sub-tasks do.
- Check it's unassigned and anything it depends on is done, then **assign yourself**.
- **Small changes don't need an issue.** For a typo, a comment, formatting, a small docs or config tweak, or anything that doesn't change what the app does, skip the issue and just open a PR (see 2.4). Everything else gets an issue first (see [ISSUES_AND_PROJECTS.md](ISSUES_AND_PROJECTS.md)).


### 2.2 Branch

```bash
git checkout main
git pull
git checkout -b <issue-number>-short-description    # e.g. 47-init-frontend
```

- Always branch off an up-to-date `main`. One branch per issue, or a bundle (see 2.3).
- Name: issue number, then a short lowercase description with hyphens. For a small change with no issue, skip the number (e.g. `fix-readme-typo`).


### 2.3 Do the work

- Stay inside the issue's scope. Found something else? Make a new issue.
- Meet the "Done when" checklist in the issue and tick the boxes.
- Never commit secrets (see [3. Rules](#3-rules)).
- Commit small and often. Your own commit messages get squashed away, so only the PR title has to be perfect.

**Bundling.** You can put several issues on **one branch and one PR** when they're tiny (typo fixes, small doc or config tweaks) or closely related (same area or files). A one-line fix isn't worth its own branch.

- Branch name lists **every** issue number with hyphens, e.g. `7-12-15-readme-fixes`. No commas.
- The PR description gets a `Closes` line per issue.

**Stay up to date.** If `main` moved while you work, **merge it into your branch** (don't rebase):

```bash
git checkout <your-branch>
git pull origin main     # fix any conflicts, then:
git push
```

In VS Code: Source Control > ... > Branch > Merge Branch > `main`. Conflicts: see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).


### 2.4 Push and open a PR

```bash
git push -u origin <your-branch>
gh pr create --base main --title "feat: add habit form" --body-file pr.md
```

- **Title:** Conventional Commits, e.g. `feat(frontend): add habit form` (scope optional). It becomes the commit on `main`, so get it right. The PR title check is required: a bad title blocks the merge until you edit it.
- **Description:** what changed and why, plus `Closes #n` for every issue it finishes. The PR template fills in the sections.
- Link only the issues this PR finishes.
- **Small change with no issue:** write `none` under Issues in the PR description. The title check, squash merge and cleanup are the same.
- In VS Code use the GitHub Pull Requests extension. Other tools: figure out the equivalent.
- Before asking for review, check the "Done when" items are met. Tests and lint: **TBD.**


### 2.5 Review (optional)

- Up to the PR author.
  - **Want a review:** request one (anyone can review) and move the issue to **In Review**.
  - **Don't need one:** approve it yourself. Fine for small changes.


### 2.6 Merge

- The **PR author merges their own PR** once there are no conflicts.
- Use **Squash and merge**. It's the only option. Check the title first.
- `Closes #n` closes the linked issues. The board moves them to **Done**.


### 2.7 Clean up

```bash
git checkout main
git pull
git branch -D <your-branch>    # capital D, see below
```

- GitHub deletes the **remote** branch for you. You delete the **local** one.
- **Leftover branches on GitHub** (abandoned, or never had a PR): delete them on the web. Go to the repo's **Branches** page and click the trash icon next to the branch, or click **Delete branch** at the bottom of a closed PR. Only delete your own branches, or ask first. There is no automatic cleanup of stale branches.
- Squash makes a new commit, so git thinks your branch isn't merged and `-d` refuses. Check the PR says **Merged**, then use `-D`.
- Don't reuse a branch after it was squash merged. Start a new one.
- Check the issue closed. If it was a task's last open sub-task, close the parent task by hand.
- Then start the next issue.

---

## 3. Rules

**Do**

- Work from an issue, except for small changes (see 2.1).
- Keep branches and PRs small and focused. Don't leave a branch sitting for days.
- Pull the latest `main` before you branch.
- Say so on the issue if you're stuck or blocked.
- Ask if something is unclear or **TBD**.

**Don't**

- Don't push straight to `main`. It's protected, so everything goes through a PR (admins included).
- Don't commit secrets: API keys, Supabase keys, `.env` files. Share them privately, never in the repo, issues or PRs.
- Don't put frontend code in `backend/` or the other way round.
- Don't bundle unrelated changes into one PR.
- One issue per PR, unless you're bundling. Small no-issue changes can be bundled in one PR too.

---

## 4. Reference

### 4.1 Closing issues from a PR

| What you write | Result |
|---|---|
| `Closes #12` in the **PR description** | Issue closes when the PR merges into `main` |
| The keyword in a **commit message** | Only counts if that message reaches `main`. We squash, so use the PR description |
| Issue linked in the PR's **Development** sidebar | Also closes on merge |
| Just `#12` | Only a link, nothing closes |
| The keyword in the **PR title** | Doesn't work |

- Keywords: close/closes/closed, fix/fixes/fixed, resolve/resolves/resolved.
- **One keyword per issue**: `Closes #12, closes #13`. `Closes #12, #13` only closes #12. This matters when you bundle.
- It only closes when the PR is **merged** into `main`. Closing the PR leaves the issue open.
- Forgot one? See "Fixing process mistakes" in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).


### 4.2 Handy gh commands

```bash
gh pr create --draft                  # open as a draft
gh pr create --fill --web             # pre-filled form in the browser, nothing created until you click
gh pr status                          # your PRs and their checks
gh pr list                            # open PRs
gh pr view <n> --web                  # read a PR in the browser
gh pr diff <n>                        # see the changes
gh pr checkout <n>                    # try someone's PR locally
gh pr ready <n>                       # draft -> ready for review
gh pr edit <n> --title "..."          # change the title or description
gh pr review <n> --approve            # also --comment --body "..." and --request-changes --body "..."
```

`gh` setup: install it and run `gh auth login`. `\n` doesn't make a line break in `--body`, so use `--body-file` for multi-line text.


### 4.3 Renaming a branch

Do it **before** you open the PR. Renaming or deleting a branch that has an open PR can close the PR.

```bash
git branch -m <old-name> <new-name>       # rename locally
git push origin -u <new-name>             # if already pushed: push the new name...
git push origin --delete <old-name>       # ...then delete the old one
```

Renaming on GitHub (Code > Branches > ... > Rename) only changes the remote, so your local branch keeps the old name and a broken upstream. Fix:

```bash
git branch -m <old-name> <new-name>
git fetch origin
git branch -u origin/<new-name> <new-name>
```

Teammates who pulled the old branch need to do the same.


### 4.4 Renaming a PR

Edit the title or description any time: **Edit** next to the title, or `gh pr edit <n> --title "..."`. It doesn't touch the branch or commits. Fix a wrong title **before** merging, because afterwards the commit on `main` can't be changed.