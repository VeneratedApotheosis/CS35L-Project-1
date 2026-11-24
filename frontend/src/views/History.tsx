"use client"

import Link from "next/link"
import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { formatDate } from "@/lib/goal"
import {
  getHistory,
  historyKeys,
  HISTORY_PAGE_SIZE,
  type HistoryFilter,
  type HistoryLevel,
  type HistorySort,
  type HistorySummary,
} from "@/lib/history"
import { LookBackTabs } from "./badges/LookBackTabs"
import { HistoryRow, LevelPill } from "./history/HistoryRow"
import { groupByMonth, isLevel, isSort, LEVELS, levelLabels, percent, sortLabels } from "./history/format"

function Summary({ summary }: { summary: HistorySummary }) {
  const missed = summary.by_level.none
  return (
    <Card className="history-summary">
      <div className="history-summary__top">
        <h2 className="text-h2">{summary.finished} finished</h2>
        <ul className="history-summary__levels" role="list" aria-label="Finished habits by level">
          {LEVELS.map((level) => (
            <li key={level} className="history-summary__level">
              <LevelPill level={level} />
              <strong>{summary.by_level[level]}</strong>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-body-sm text-secondary">
        {summary.total_logs} {summary.total_logs === 1 ? "activity" : "activities"} logged · {percent(summary.average_final_progress)} average final progress
        {missed > 0 && <> · {missed} ended below 60%. Every attempt counts.</>}
      </p>
    </Card>
  )
}

/**
 * The History tab (#254): every finished habit, newest first, with a summary,
 * level filters and a sort. Reads GET /me/history, 20 at a time. The filter
 * and sort live in the URL, so going back from a habit keeps them. See
 * docs/frontend/habit-history-plan.md.
 */
export default function History() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const levelParam = params.get("level")
  const sortParam = params.get("sort")
  const filter: HistoryFilter = useMemo(() => ({
    level: isLevel(levelParam) ? levelParam : null,
    sort: isSort(sortParam) ? sortParam : "newest",
  }), [levelParam, sortParam])

  const query = useInfiniteQuery({
    queryKey: historyKeys.list(user?.id ?? "signed-out", filter),
    queryFn: ({ pageParam }) => getHistory(filter, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.offset + last.habits.length < last.total ? last.offset + HISTORY_PAGE_SIZE : undefined,
    enabled: Boolean(user),
    retry: false,
    // A new filter or sort is a new query. Keep the last list on screen while
    // it loads, instead of dropping back to the loading line.
    placeholderData: keepPreviousData,
  })
  const switching = query.isPlaceholderData

  const pages = query.data?.pages
  const summary = pages?.[0]?.summary
  const habits = useMemo(() => pages?.flatMap((page) => page.habits) ?? [], [pages])
  const total = pages?.[0]?.total ?? 0
  const currentYear = new Date().getFullYear()
  const unauthorized = query.error instanceof ApiError && query.error.status === 401

  function setFilter(next: { level?: HistoryLevel | null; sort?: HistorySort }) {
    const search = new URLSearchParams(params.toString())
    const level = next.level === undefined ? filter.level : next.level
    const sort = next.sort ?? filter.sort
    if (level) search.set("level", level)
    else search.delete("level")
    if (sort !== "newest") search.set("sort", sort)
    else search.delete("sort")
    const qs = search.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const remaining = total - habits.length

  return (
    <main className="stack-lg">
      <header className="stack-sm">
        <h1 className="text-h1">History</h1>
        <p className="text-body text-secondary">Every habit you have finished, and how it went.</p>
      </header>
      <LookBackTabs current="/history" />

      {query.isError && (
        <Card className="stack-md">
          <div role="alert" className="stack-sm">
            <h2 className="text-h3">{unauthorized ? "Sign in to see your history" : "Couldn't load your history"}</h2>
            <p className="text-body text-secondary">
              {unauthorized ? "Your session has expired. Sign in again to continue." : "Check your connection and try again."}
            </p>
          </div>
          {unauthorized ? (
            <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
          ) : (
            <Button variant="secondary" className="self-start" onClick={() => void query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? "Trying again…" : "Try again"}
            </Button>
          )}
        </Card>
      )}

      {query.isPending && !query.isError && (
        <p role="status" className="text-body text-secondary">Loading your history…</p>
      )}

      {summary && summary.finished === 0 && (
        <Card className="stack-md">
          <h2 className="text-h3">No finished habits yet</h2>
          <p className="text-body text-secondary">
            Habits you finish will appear here, with how they went.
            {summary.next_end_date && <> Your next one ends {formatDate(summary.next_end_date)}.</>}
          </p>
          <Link className="button button--secondary button--md self-start" href="/">Go to your garden</Link>
        </Card>
      )}

      {summary && summary.finished > 0 && (
        <>
          <Summary summary={summary} />

          <div className="history-toolbar">
            <div className="history-toolbar__levels" role="group" aria-label="Show level">
              <Button size="sm" variant={filter.level === null ? "primary" : "secondary"} aria-pressed={filter.level === null}
                onClick={() => setFilter({ level: null })}>All</Button>
              {LEVELS.map((level) => (
                <Button key={level} size="sm" variant={filter.level === level ? "primary" : "secondary"} aria-pressed={filter.level === level}
                  onClick={() => setFilter({ level })}>
                  {levelLabels[level]} <span className="history-toolbar__count">{summary.by_level[level]}</span>
                </Button>
              ))}
            </div>
            <label className="history-toolbar__sort text-body-sm">
              <span className="text-secondary">Sort</span>
              <select className="select history-toolbar__select" value={filter.sort}
                onChange={(event) => setFilter({ sort: isSort(event.target.value) ? event.target.value : "newest" })}>
                {(Object.keys(sortLabels) as HistorySort[]).map((sort) => <option key={sort} value={sort}>{sortLabels[sort]}</option>)}
              </select>
            </label>
          </div>

          <div className="history-results stack-lg" aria-busy={switching} data-switching={switching || undefined}>
          {habits.length === 0 && filter.level && (
            <Card className="stack-md">
              <p className="text-body text-secondary">No {levelLabels[filter.level]} habits yet.</p>
              <Button variant="secondary" size="sm" className="self-start" onClick={() => setFilter({ level: null })}>Show all</Button>
            </Card>
          )}

          {habits.length > 0 && filter.sort === "best" && (
            <Card className="history-month"><ul className="history-list" role="list">
              {habits.map((habit) => <HistoryRow key={habit.id} habit={habit} currentYear={currentYear} />)}
            </ul></Card>
          )}

          {habits.length > 0 && filter.sort !== "best" && groupByMonth(habits).map((group) => (
            <section key={group.month} className="stack-sm" aria-label={group.month}>
              <h2 className="text-h3">{group.month}</h2>
              <Card className="history-month"><ul className="history-list" role="list">
                {group.habits.map((habit) => <HistoryRow key={habit.id} habit={habit} currentYear={currentYear} />)}
              </ul></Card>
            </section>
          ))}

          {query.hasNextPage && !switching && (
            <Button variant="secondary" className="self-center" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage ? "Loading…" : `Show more (${remaining})`}
            </Button>
          )}
          </div>
        </>
      )}
    </main>
  )
}
