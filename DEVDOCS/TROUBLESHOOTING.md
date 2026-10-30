# Troubleshooting

Part of the [Developer Guide](DEVELOPER.md). For undoing commits see [UNDOING.md](UNDOING.md).

---

## Purpose

Read this file to find the fix for common problems: merge conflicts, a committed secret, Windows and PowerShell quirks, and mistakes in the ticketing process.

## What's in this file

- [1. Merge conflicts](#1-merge-conflicts)
- [2. I committed a secret](#2-i-committed-a-secret)
- [3. Windows and PowerShell notes](#3-windows-and-powershell-notes)
- [4. Fixing process mistakes (bodges)](#4-fixing-process-mistakes-bodges)

---

## 1. Merge conflicts

A merge conflict happens when two changes touch the same lines and git can't
pick a winner. It's normal. Don't panic.

We update a branch by **merging** `main` into it (no rebasing):

```
git checkout <branch>
git pull origin main
```

If someone else edited the same lines, the pull stops with a conflict.
`git status` lists the conflicted files under "Unmerged paths".

Git marks the file like this:

```
<<<<<<< HEAD
const title = "My version";
=======
const title = "Their version";
>>>>>>> main
```

- `<<<<<<<` to `=======` is **your** branch (current).
- `=======` to `>>>>>>>` is what's coming from `main` (incoming).

**Fix it in VS Code.** Buttons show above each conflict:

- **Accept Current Change**: keep your side.
- **Accept Incoming Change**: keep the `main` side.
- **Accept Both Changes**: keep both.
- **Compare Changes**: see the two sides next to each other.

Then save the file, stage it (`git add <file>`), commit (`git commit`, the
default merge message is fine), and push (`git push`).

**Fix it by hand.** Edit the file into the code you want, delete all three
marker lines, then save, stage, commit, and push.

**Want to start over?** Undo the merge:

```
git merge --abort
```

**Ask the team for help** if the conflict is large or you're not sure which
side to keep. Guessing can silently delete someone's work.

---

## 2. I committed a secret

Secrets are things like Supabase keys, API keys, and anything in `.env`.

Do these in order:

1. **Rotate or revoke the key right away** (make a new one in Supabase or
   wherever it came from).
2. **Tell the team right away.**
3. Remove the secret from the code and load it from a `.env` file instead.
   Make sure `.env` is listed in `.gitignore`.

Deleting the commit or the file is **not enough**. The secret stays in git
history, and on GitHub if you pushed. Assume someone could have seen it. That's
why step 1 comes first.

**Never pushed?** Undo the commit but keep your changes, then remove the secret:

```
git reset --soft HEAD~1
```

Never put secrets in issues or PRs either.

---

## 3. Windows and PowerShell notes

The command line is optional. VS Code can do all of this with buttons.
If you do use PowerShell:

- **`&&` doesn't work** in Windows PowerShell 5. Run commands on separate
  lines, or use `;`:
  ```
  git checkout my-branch; git pull origin main
  ```
- **Quote strings** with spaces or special characters, like
  `git commit -m "my message"`.
- **`\n` is not a newline** in a quoted PowerShell string. For long text like a
  PR body, write it in a file:
  ```
  gh pr create --body-file pr.md
  ```
- **Line endings:** Windows uses CRLF, so git may warn "LF will be replaced by
  CRLF". On Windows, you can run:
  ```
  git config --global core.autocrlf true
  ```
- **Paths use backslashes** on Windows (`src\app\page.tsx`).

---

## 4. Fixing process mistakes (bodges)

Forgot a step? Fine. **Fix forward and leave a comment saying what happened.** Never rewrite `main` to hide a mistake.

| Mistake                                                            | Fix                                                                                                                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forgot `Closes #n`**, so the issue is still open after the merge | Close it by hand as **completed** and comment, e.g. `Done in #82, forgot the Closes keyword`. Typing `#82` links the PR. The board moves it to Done by itself. |
| **Wrote `Closes #12, #13`**, so only #12 closed                    | Close #13 by hand the same way. One keyword per issue next time.                                                                                               |
| **Merged with no issue at all**                                    | Create the issue afterwards, link the PR in a comment, close it as completed with `Created after the fact, done in #82`.                                       |
| **Closed an issue by mistake**                                     | Reopen it.                                                                                                                                                     |
| **Parent task or epic still open** after its last child closed     | Close it by hand. Parents never close themselves.                                                                                                              |
| **Wrong label, milestone, assignee or board status**               | Just edit it. Nothing breaks.                                                                                                                                  |
| **Wrong PR title after the merge**                                 | Leave it. The commit on `main` can't be edited. Get it right next time.                                                                                        |
| **Wrong PR title before the merge**                                | Click **Edit** next to the title, or `gh pr edit <n> --title "..."`. It re-runs the title check.                                                               |
| **PR links the wrong issue**                                       | Edit the PR description. If it already merged and closed the wrong issue, reopen that issue and close the right one by hand.                                   |
| **Merged something broken**                                        | Revert it with a new PR (see [UNDOING.md](UNDOING.md)).                                                                                                        |
| **Pushed to the wrong branch**                                     | See [UNDOING.md](UNDOING.md).                                                                                                                                  |

Closing by hand, from the command line:
```bash
gh issue close 12 --reason completed --comment "Done in #82, forgot the Closes keyword"
gh issue reopen 12
```
In the browser: open the issue, use the **Close issue** dropdown at the bottom (**Close as completed** or **Close as not planned**), and write the comment in the box above it.

Use **not planned** when the work was dropped or is a duplicate, and **completed** when it was done.