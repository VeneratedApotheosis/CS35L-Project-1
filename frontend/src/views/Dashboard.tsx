"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { dashboardKey, getDashboard, type FinishedHabit } from "@/lib/dashboard"
import { formatDate } from "@/lib/goal"

const periods = (count: number) => `${count} ${count === 1 ? "period" : "periods"}`

const badgeLabels = { gold: "Gold badge", silver: "Silver badge", bronze: "Bronze badge", none: "No badge" }
const finalPercent = (rate: number | null) => rate === null ? "—"
  : new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 2 }).format(rate)

function FinalResult({ habit }: { habit: FinishedHabit }) {
  const noBadge = habit.badge === "none"
  return (
    <li className={`dashboard-result stack-md ${noBadge ? "dashboard-result--no-badge" : "dashboard-result--awarded"}`}>
      <header className="dashboard-result-heading">
        <div className="stack-sm">
          <h3 className="text-h3 garden-name"><Link className="garden-link" href={`/habits/${habit.id}`}>{habit.name}</Link></h3>
          <p className="text-body-sm text-secondary">Ended <time dateTime={habit.end_date}>{formatDate(habit.end_date)}</time></p>
        </div>
        <span className="dashboard-result-label text-caption">{badgeLabels[habit.badge]}</span>
      </header>
      <dl className="dashboard-result-metrics text-body">
        <div className="stack-sm"><dt className="text-secondary">Final progress</dt><dd className="dashboard-value">{finalPercent(habit.progress)}</dd></div>
        <div className="stack-sm"><dt className="text-secondary">Final consistency</dt><dd className="dashboard-value">{finalPercent(habit.consistency)}</dd></div>
      </dl>
      {noBadge && <p className="text-body-sm text-secondary">Ended below 60% of the total target. Every attempt is a chance to learn and grow.</p>}
    </li>
  )
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const query = useQuery({
    queryKey: dashboardKey(user?.id ?? "signed-out"),
    queryFn: getDashboard,
    enabled: Boolean(user),
    retry: false,
    refetchInterval: 60_000,
  })
  const data = query.data
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const consistency = data?.overall_consistency == null ? "—"
    : new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 }).format(data.overall_consistency)

  return (
    <main className="stack-lg">
      <header className="stack-sm">
        <h1 className="text-h1">Dashboard</h1>
        <p className="text-body text-secondary">See how your habits are growing over time.</p>
      </header>

      {query.isError && (
        <Card className="stack-md">
          <div role="alert" className="stack-sm">
            <h2 className="text-h3">{unauthorized ? "Sign in to see your dashboard" : "Couldn't load your dashboard"}</h2>
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

      {query.isPending && (
        <p role="status" className="text-body text-secondary">Loading your dashboard…</p>
      )}

      {data && (
        <>
          <dl className="dashboard-summary" aria-label="Habit summary">
            <Card className="stack-sm">
              <dt className="text-body text-secondary">Active habits</dt>
              <dd className="text-h2 dashboard-value">{data.active_count}</dd>
              <dd className="text-body-sm text-secondary dashboard-value">Includes habits that haven&apos;t started yet.</dd>
            </Card>
            <Card className="stack-sm">
              <dt className="text-body text-secondary">Overall consistency</dt>
              <dd className="text-h2 dashboard-value">{consistency}</dd>
              <dd className="text-body-sm text-secondary dashboard-value">
                {data.overall_consistency === null ? "Available after your first completed period." : "Average consistency across your active habits."}
              </dd>
            </Card>
            <Card className="stack-sm">
              <dt className="text-body text-secondary">Best current streak</dt>
              <dd className="text-h2 dashboard-value">{data.best_streak ? periods(data.best_streak.streak) : "—"}</dd>
              <dd className="text-body-sm dashboard-value">
                {data.best_streak ? (
                  <Link className="garden-link" href={`/habits/${data.best_streak.id}`}>{data.best_streak.name}</Link>
                ) : <span className="text-secondary">Meet a goal to start a streak.</span>}
              </dd>
            </Card>
          </dl>

          <section className="stack-md" aria-labelledby="dashboard-attention">
            <div className="stack-sm">
              <h2 className="text-h2" id="dashboard-attention">A little attention</h2>
              <p className="text-body-sm text-secondary">Small steps count. A little care can help your habits grow.</p>
            </div>
            {data.needs_attention.length > 0 ? (
              <ul className="dashboard-habits">
                {data.needs_attention.map((habit) => (
                  <li key={habit.id} className="dashboard-habit">
                    <Link className="text-h3 garden-link garden-name" href={`/habits/${habit.id}`}>{habit.name}</Link>
                    <span className="text-body-sm text-secondary">
                      {habit.health === "wilted" ? "Wilted" : habit.health === "slightly_wilted" ? "Slightly wilted" : "Ready for a little care"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Card>
                <p className="text-body text-secondary">Nothing needs extra attention right now. Keep growing at your own pace.</p>
              </Card>
            )}
          </section>

          {data.habits.length > 0 ? (
            <section className="stack-md" aria-labelledby="dashboard-streaks">
              <div className="stack-sm">
                <h2 className="text-h2" id="dashboard-streaks">Current streaks</h2>
                <p className="text-body-sm text-secondary">A streak counts consecutive goal periods, such as weeks for a weekly habit.</p>
              </div>
              <ul className="dashboard-habits">
                {data.habits.map((habit) => {
                  const best = habit.id === data.best_streak?.id
                  return (
                    <li key={habit.id} className={`dashboard-habit${best ? " dashboard-habit--best" : ""}`}>
                      <div className="stack-sm">
                        <Link className="text-h3 garden-link garden-name" href={`/habits/${habit.id}`}>{habit.name}</Link>
                        {habit.state === "not_started" && <span className="text-body-sm text-secondary">Not started yet</span>}
                      </div>
                      <div className="dashboard-streak stack-sm">
                        <span className="text-body">{periods(habit.streak)}</span>
                        {best && <span className="text-caption">Best streak</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : (
            <Card className="stack-md">
              <h2 className="text-h2">{data.finished.length > 0 ? "No active habits" : "No active habits yet"}</h2>
              <p className="text-body text-secondary">Create a habit to start building your streaks, one period at a time.</p>
              <Link href="/create" className="button button--primary button--md self-start">Create a habit</Link>
            </Card>
          )}

          <section className="stack-md" aria-labelledby="dashboard-finished">
            <div className="stack-sm">
              <h2 className="text-h2" id="dashboard-finished">Finished habits</h2>
              <p className="text-body-sm text-secondary">Look back on your final results and what you learned along the way.</p>
            </div>
            {data.finished.length > 0 ? (
              <ul className="dashboard-habits">
                {data.finished.map((habit) => <FinalResult key={habit.id} habit={habit} />)}
              </ul>
            ) : (
              <Card><p className="text-body text-secondary">No finished habits yet. When a habit ends, its final results will appear here. Keep growing at your own pace.</p></Card>
            )}
          </section>
        </>
      )}
    </main>
  )
}
