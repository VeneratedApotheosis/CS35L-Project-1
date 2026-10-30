# Commit Conventions

Part of the [Developer Guide](DEVELOPER.md). How we write commit messages.

---

## Purpose

Read this file to learn the Conventional Commits format we use for PR titles and commit messages, and how it is enforced.

## What's in this file

- [1. The format](#1-the-format)
- [2. Types](#2-types)
- [3. Scope](#3-scope)
- [4. Rules](#4-rules)
- [5. Examples](#5-examples)
- [6. Enforcement](#6-enforcement)

---

## 1. The format

We squash merge, so the **PR title** is what ends up as the commit on `main`. Make the PR title follow this format. Your own commits on the branch should too, but they get squashed away.

We use [Conventional Commits](https://www.conventionalcommits.org/), following [this cheat sheet](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13).

```
<type>(<optional scope>): <description>

<optional body>

<optional footer>
```

---

## 2. Types

| Type | Use for |
|---|---|
| `feat` | Add, adjust or remove a feature of the API or UI |
| `fix` | Fix an API or UI bug |
| `refactor` | Restructure code without changing behavior |
| `perf` | A refactor that improves performance |
| `style` | Formatting only (whitespace, semicolons) |
| `test` | Add or correct tests |
| `docs` | Documentation only |
| `build` | Build tools, dependencies, project version |
| `ops` | Infrastructure, deployment, CI/CD |
| `chore` | Other tasks (initial commit, `.gitignore`, ...) |

---

## 3. Scope

Optional: one of `frontend`, `backend`, `database`, `auth`, `design`, `repo`. Don't put issue numbers in the scope.

---

## 4. Rules

- Description is imperative, present tense ("add", not "added"), lowercase first letter, no period at the end.
- Breaking change: add `!` before the colon (`feat(backend)!: remove status endpoint`) and describe it in the footer starting with `BREAKING CHANGE:`.
- Reference the issue with `Closes #12` in the **PR description** (and the footer if you like).

The usual mapping from issue `type:` label to commit type is in `project/github_ticketing_system.md`.

---

## 5. Examples

```
feat(frontend): add habit creation form
fix(backend): return 401 when the token is missing
docs(repo): add developer guide
chore(repo): add gitignore

feat(backend)!: remove status endpoint

BREAKING CHANGE: /status no longer exists, use /health.
```

---

## 6. Enforcement

A GitHub Action (`pr-title.yml`) checks the PR title and is a **required check**. A bad title turns the check red and **Squash and merge is blocked** until you fix the title (the check re-runs when you edit it). There is no commitlint or husky. 