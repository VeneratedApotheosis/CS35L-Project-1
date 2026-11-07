"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { durationPhrase, formatDate, periodPhrase } from "@/lib/goal"
import { habitKeys, listHabits } from "@/lib/habits"
import { dateInTimezone, getProfile } from "@/lib/profile"

export default function Garden() {
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
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const profile = await getProfile()
      return { ...profile, today: dateInTimezone(profile.timezone) }
    },
    enabled: Boolean(user),
    retry: false,
    // Re-evaluate today's date while the garden stays open, including midnight.
    refetchInterval: 60_000,
  })

  const error = habits.error ?? profile.error
  const unauthorized = error instanceof ApiError && error.status === 401
  const pending = habits.isPending || profile.isPending
  const rows = habits.data?.pages.flatMap((page) => page.habits) ?? []
  const today = profile.data?.today ?? ""

  function retry() {
    void habits.refetch()
    void profile.refetch()
  }

  return (
    <main className="stack-lg">
      <header className="stack-sm">
        <h1 className="text-h1">My Garden</h1>
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

      {!pending && rows.length > 0 && (
        <section aria-label="Saved habits" className="stack-md">
          <ul className="garden-list">
            {rows.map((habit) => (
              <li key={habit.id}>
                <Card className="stack-sm">
                  <h2 className="text-h3 garden-name">{habit.name}</h2>
                  <p className="text-body text-secondary">
                    {habit.target_count} {habit.target_count === 1 ? "time" : "times"}{" "}
                    {periodPhrase(habit.interval_count, habit.interval_unit)}
                    {habit.num_periods !== null && ` ${durationPhrase(habit.interval_count, habit.interval_unit, habit.num_periods)}`}.
                  </p>
                  {today && habit.start_date > today && (
                    <p className="text-body-sm">Not started yet · Starts {formatDate(habit.start_date)}</p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
          {habits.hasNextPage && (
            <Button variant="secondary" className="self-start" onClick={() => void habits.fetchNextPage()}
              disabled={habits.isFetching}>
              {habits.isFetchingNextPage ? "Loading more…" : "Load more habits"}
            </Button>
          )}
        </section>
      )}

      {!error && !pending && rows.length === 0 && (
        <Card className="stack-md">
          <h2 className="text-h2">No habits yet</h2>
          <p className="text-body text-secondary">Create your first habit to start your garden.</p>
          <Link href="/create" className="button button--primary button--md self-start">Create your first habit</Link>
        </Card>
      )}

      <footer className="stack-sm">
        <p className="text-body-sm text-secondary">Signed in as {user?.email}</p>
        <Button variant="ghost" className="self-start" onClick={() => void signOut()}>Sign out</Button>
      </footer>
    </main>
  )
}
