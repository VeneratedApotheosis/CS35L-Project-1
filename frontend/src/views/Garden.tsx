"use client"

import { useRef, useState } from "react"
import { Toast } from "@/components/Toast"
import { addActivity, deleteActivity } from "@/lib/logs"
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { GardenShelves } from "./garden/GardenShelves"
import { SharedHabitCard } from "./garden/SharedHabitCard"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { formatDate } from "@/lib/goal"
import { habitKeys, listHabits } from "@/lib/habits"
import { useProfile } from "@/lib/useProfile"
import { listSharedHabits, sharedHabitKeys } from "@/lib/sharedHabits"

/** Shared saved-habit list for the Garden and the basic dashboard. */
export default function Garden({ title = "My Garden" }: { title?: string }) {
  const { user, signOut } = useAuth()
  const habits = useInfiniteQuery({
    queryKey: habitKeys.all(user?.id ?? "signed-out"),
    queryFn: ({ pageParam }) => listHabits(pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) => {
      const next = page.offset + page.habits.length
      return page.habits.length > 0 && next < page.total ? next : undefined
    },
    enabled: Boolean(user),
    retry: false,
  })
  const profile = useProfile()
  const sharedHabits = useInfiniteQuery({
    queryKey: sharedHabitKeys.list(user?.id ?? "signed-out"),
    queryFn: ({ pageParam }) => listSharedHabits(pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) => page.offset + page.limit < page.total ? page.offset + page.limit : undefined,
    enabled: Boolean(user), retry: false, refetchInterval: 60_000,
  })
  const client = useQueryClient()
  const writing = useRef(false)
  const [noticeId, setNoticeId] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ message: string; error?: boolean; undo?: () => void } | null>(null)

  async function logToday(habitId: string) {
    if (writing.current || !user || !profile.data?.today) return
    writing.current = true
    setNoticeId((id) => id + 1)
    setBusy(true)
    try {
      const result = await addActivity(habitId, profile.data.today)
      void client.invalidateQueries({ queryKey: habitKeys.all(user.id) })
      setNotice({ message: "Activity logged for today.", undo: () => { void undoLog(habitId, result.log.id) } })
    } catch (error) {
      setNotice({ message: error instanceof ApiError && error.status === 401 ? "Your session expired. Sign in again to log activity." : "Couldn't log activity. Check your connection and try again.", error: true })
    } finally { writing.current = false; setBusy(false) }
  }

  /** Logs another day. The caller shows a failure, so this throws; success gets the same Undo toast. */
  async function logOn(habitId: string, date: string) {
    if (writing.current || !user) throw new Error("busy")
    writing.current = true
    setBusy(true)
    try {
      const result = await addActivity(habitId, date)
      void client.invalidateQueries({ queryKey: habitKeys.all(user.id) })
      setNoticeId((id) => id + 1)
      setNotice({ message: `Activity logged for ${formatDate(date)}.`, undo: () => { void undoLog(habitId, result.log.id) } })
    } finally { writing.current = false; setBusy(false) }
  }

  async function undoLog(habitId: string, logId: string) {
    if (writing.current || !user) return
    writing.current = true
    setNoticeId((id) => id + 1)
    setBusy(true)
    try {
      await deleteActivity(habitId, logId)
      void client.invalidateQueries({ queryKey: habitKeys.all(user.id) })
      setNotice({ message: "Activity removed." })
    } catch {
      setNotice({ message: "Couldn't undo activity. Try deleting it from habit details.", error: true })
    } finally { writing.current = false; setBusy(false) }
  }

  const error = habits.error ?? profile.error
  const unauthorized = error instanceof ApiError && error.status === 401
  const pending = habits.isPending || profile.isPending
  const rows = habits.data?.pages.flatMap((page) => page.habits) ?? []
  const sharedRows = (sharedHabits.data?.pages.flatMap((page) => page.habits) ?? [])
    .toSorted((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  const sharedError = sharedHabits.error
  const sharedUnauthorized = sharedError instanceof ApiError && sharedError.status === 401
  const sharedUnavailable = sharedUnauthorized || (sharedError instanceof ApiError && sharedError.status === 403)
  const allEmpty = !error && !pending && !sharedError && !sharedHabits.isPending && !sharedHabits.hasNextPage && rows.length === 0 && sharedRows.length === 0
  const today = profile.data?.today ?? ""

  function retry() {
    void habits.refetch()
    void profile.refetch()
  }

  return (
    <main className="stack-lg">
      <header className="stack-sm">
        <h1 className="text-h1">{title}</h1>
        <p className="text-body text-secondary">Your habits and the goals you’re working toward.</p>
      </header>

      {error && (
        <Card className="stack-md">
          <div role="alert" className="stack-sm">
            <h2 className="text-h3">{unauthorized ? "Sign in to see your habits" : "Couldn't load your habits"}</h2>
            <p className="text-body text-secondary">
              {unauthorized ? "Your session has expired. Sign in again to continue." : "Check your connection and try again. Your saved habits are still there."}
            </p>
          </div>
          {unauthorized ? (
            <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
          ) : (
            <Button className="self-start" variant="secondary" onClick={retry}
              disabled={habits.isFetching || profile.isFetching}>
              {habits.isFetching || profile.isFetching ? "Trying again…" : "Try again"}
            </Button>
          )}
        </Card>
      )}

      {!error && pending && (
        <section aria-label="Loading habits" aria-busy="true" className="stack-md">
          <p role="status" className="text-body text-secondary">Loading your habits…</p>
          <div aria-hidden="true" className="stack-md">
            {[0, 1, 2].map((key) => (
              <Card key={key} className="stack-sm">
                <div className="garden-placeholder garden-placeholder--name" />
                <div className="garden-placeholder garden-placeholder--goal" />
              </Card>
            ))}
          </div>
        </section>
      )}

      {!pending && rows.length > 0 && user && (
        <section aria-label="Your habits" className="stack-md">
          <GardenShelves habits={rows} userId={user.id} today={today} loggingDisabled={busy}
            onLogToday={(id) => { void logToday(id) }} onLogOn={logOn} />
          {habits.hasNextPage && (
            <Button variant="secondary" className="self-start" onClick={() => void habits.fetchNextPage()}
              disabled={habits.isFetching}>
              {habits.isFetchingNextPage ? "Loading more…" : "Load more habits"}
            </Button>
          )}
        </section>
      )}

      {user && !allEmpty && <section className="stack-md" aria-labelledby="garden-shared-heading">
        <h2 id="garden-shared-heading" className="text-h2">Shared habits</h2>
        {sharedError && <Card className="stack-md">
          <div role="alert" className="stack-sm">
            <h3 className="text-h3">{sharedUnauthorized ? "Sign in to see shared habits" : "Couldn't load shared habits"}</h3>
            <p>{sharedUnauthorized ? "Your session has expired. Sign in again to continue." : "Check your connection and try again. Your saved habits are still there."}</p>
          </div>
          {sharedUnauthorized ? <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
            : <Button className="self-start" disabled={sharedHabits.isFetching} onClick={() => void sharedHabits.refetch()}>Try shared habits again</Button>}
        </Card>}
        {sharedHabits.isPending && !sharedError && <p aria-live="polite" className="text-body-sm text-secondary">Loading shared habits…</p>}
        {!sharedUnavailable && sharedRows.length > 0 && <div className="shared-garden-grid">
          {sharedRows.map((habit) => <SharedHabitCard key={habit.id} habit={habit} />)}
        </div>}
        {!sharedHabits.isPending && !sharedError && !sharedHabits.hasNextPage && sharedRows.length === 0 && <p className="text-body text-secondary">No shared habits yet. Choose “With friends” when creating a habit to grow together.</p>}
        {sharedHabits.hasNextPage && !sharedUnavailable && <Button className="self-start" variant="secondary"
          disabled={sharedHabits.isFetching} onClick={() => void sharedHabits.fetchNextPage()}>
          {sharedHabits.isFetchingNextPage ? "Loading more shared habits…" : "Load more shared habits"}
        </Button>}
      </section>}

      {allEmpty && (
        <Card className="stack-md">
          <h2 className="text-h2">No habits yet</h2>
          <p className="text-body text-secondary">Create your first habit to start your garden.</p>
          <Link href="/create" className="button button--primary button--md self-start">Create your first habit</Link>
        </Card>
      )}

      {notice && <Toast key={noticeId} message={notice.message} variant={notice.error ? "error" : "success"}
        onDismiss={() => setNotice(null)} action={!busy && notice.undo ? { label: "Undo", onClick: notice.undo } : undefined} />}
    </main>
  )
}
