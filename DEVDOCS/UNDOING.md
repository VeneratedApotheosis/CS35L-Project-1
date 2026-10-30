# Undoing Things

Part of the [Developer Guide](DEVELOPER.md).

Mistakes happen. Here's how to fix the common ones.

> VS Code's Source Control panel can unstage and discard changes with a click (the `-` and "discard" icons next to a file).
>
> On PowerShell 5, `&&` doesn't work. Run commands on separate lines.

---

## Purpose

Read this file to learn how to undo mistakes in git, from unstaging a file to reverting a merge or recovering with the reflog.

## What's in this file

- [1. Unstage a file](#1-unstage-a-file)
- [2. Discard uncommitted changes to a file](#2-discard-uncommitted-changes-to-a-file)
- [3. Fix the last commit (message or forgotten file)](#3-fix-the-last-commit-message-or-forgotten-file)
- [4. Undo the last commit but keep the work](#4-undo-the-last-commit-but-keep-the-work)
- [5. Undo a commit that's already pushed (or on main)](#5-undo-a-commit-thats-already-pushed-or-on-main)
- [6. Revert a merge commit](#6-revert-a-merge-commit)
- [7. Revert several commits as one PR](#7-revert-several-commits-as-one-pr)
- [8. Abort or continue a revert/merge/rebase](#8-abort-or-continue-a-revertmergerebase)
- [9. Recover a deleted branch or lost commit](#9-recover-a-deleted-branch-or-lost-commit)
- [10. Never do this](#10-never-do-this)

---

## 1. Unstage a file

```bash
# keeps your edits, just removes it from the next commit
git restore --staged path/to/file
```

Use when you ran `git add` on something you didn't mean to.

---

## 2. Discard uncommitted changes to a file

```bash
# WARNING: permanent, these edits can't be recovered
git restore path/to/file
```

Use when you want a file back to how it was at the last commit.

---

## 3. Fix the last commit (message or forgotten file)

```bash
git add forgotten-file
git commit --amend            # edit the message, or keep it
```

Use only **before pushing**. Amending rewrites the commit.

---

## 4. Undo the last commit but keep the work

```bash
# commit is gone, changes stay staged
git reset --soft HEAD~1
```

Use when the commit was premature and you want to redo it. Local only, not pushed.

---

## 5. Undo a commit that's already pushed (or on main)

```bash
# makes a NEW commit that cancels the old one
git revert <hash>
```

Use this for anything shared. It's safe because history is not rewritten. Use the message `chore: revert <what you reverted>` (`revert` isn't one of our commit types).

---

## 6. Revert a merge commit

```bash
# -m 1 = keep the main side (parent 1), undo what the branch brought in
git revert -m 1 <merge-hash>
```

Use when a whole merged PR needs to go. Heads up: merging the same branch again later **won't** bring the changes back, because git thinks they're already in. Revert the revert first, then merge.

---

## 7. Revert several commits as one PR

```bash
git revert --no-commit <hash1> <hash2> <hash3>
git commit -m "chore: revert broken search changes"
```

Use when a feature spans multiple commits. Push the branch and open one PR.

---

## 8. Abort or continue a revert/merge/rebase

```bash
git revert --abort     # back to before you started
git revert --continue  # after fixing conflicts and staging
# same idea: git merge --abort, git rebase --abort / --continue
```

Use when you're stuck mid-conflict and want out (or want to finish).

---

## 9. Recover a deleted branch or lost commit

```bash
git reflog                       # find the hash from before things went wrong
git switch -c rescued <hash>     # new branch pointing at it
```

Use when you deleted a branch, or a reset/amend ate a commit. Reflog is local only and entries expire eventually.

---

## 10. Never do this

- Never force-push (`git push --force`) or rewrite history on `main`.
- When in doubt on shared branches, `git revert` instead.
