"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { HabitPlant } from "@/components/HabitPlant"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { getHabit, habitKeys, type Habit } from "@/lib/habits"
import { computeEndDate, formatDate, periodPhrase } from "@/lib/goal"
import { useProfile } from "@/lib/useProfile"
import { plantTypeById } from "@/plants/plantTypes"

/** Only display data returned by the protected API, cached per account. */
export default function HabitDetails({ id }: { id: string }) {
  const { user, signOut } = useAuth()
  const profile = useProfile()
  const habit = useQuery({
    queryKey: habitKeys.detail(user?.id ?? "signed-out", id),
    queryFn: () => getHabit(id),
    enabled: Boolean(user),
    retry: false,
  })

  const status = habit.error instanceof ApiError ? habit.error.status : undefined
  const unavailable = status === 404 || status === 400

  return (
    <main className="stack-lg">
      <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>
      {habit.isError ? (
        <Card className="stack-md">
          <div role="alert" className="stack-sm">
            <h1 className="text-h2">
              {unavailable ? "Habit not found" : status === 401 ? "Sign in to see this habit" : "Couldn't load this habit"}
            </h1>
            <p className="text-body text-secondary">
              {unavailable ? "This habit isn't available. Return to your Garden to see your habits."
                : status === 401 ? "Your session has expired. Sign in again to continue."
                  : "Check your connection and try again."}
            </p>
          </div>
          {!unavailable && (status === 401 ? (
            <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
          ) : (
            <Button variant="secondary" className="self-start" onClick={() => void habit.refetch()} disabled={habit.isFetching}>
              {habit.isFetching ? "Trying again…" : "Try again"}
            </Button>
          ))}
        </Card>
      ) : habit.isPending ? (
        <p role="status" className="text-body text-secondary">Loading habit…</p>
      ) : (
        <>
          <HabitPlant habit={habit.data} />
          <HabitInfo habit={habit.data} today={profile.data?.today} />
        </>
      )}
    </main>
  )
}

/** Calendar dates only: UTC subtraction avoids 23/25-hour daylight-saving days. */
function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000)
}

function HabitInfo({ habit, today }: { habit: Habit; today?: string }) {
  // Reuse the create form's calendar arithmetic until the stats API supplies dates.
  const end = habit.num_periods === null ? null : computeEndDate(
    habit.start_date, habit.interval_unit, habit.interval_count, habit.num_periods,
  )
  const upcoming = today !== undefined && today < habit.start_date
  const finished = today !== undefined && end !== null && today >= end
  const days = today ? daysBetween(today, upcoming ? habit.start_date : end ?? today) : 0
  const duration = `${days} ${days === 1 ? "day" : "days"}`

  return (
    <section className="stack-lg habit-info" aria-labelledby="habit-name">
      <header className="stack-sm">
        <h1 id="habit-name" className="text-h1 garden-name">{habit.name}</h1>
        <p className="text-body text-secondary">
          {habit.target_count} {habit.target_count === 1 ? "time" : "times"} {periodPhrase(habit.interval_count, habit.interval_unit)}
        </p>
      </header>
      <Card className="stack-md">
        <h2 className="text-h2">Habit details</h2>
        <dl className="habit-info-grid text-body">
          <div className="stack-sm">
            <dt className="text-secondary">Plant type</dt>
            <dd>{plantTypeById(habit.plant_type)?.label ?? habit.plant_type}</dd>
          </div>
          <div className="stack-sm">
            <dt className="text-secondary">Status</dt>
            <dd>{!today ? "Loading status…" : upcoming ? "Not started yet" : finished ? "Finished" : "Active"}</dd>
          </div>
          <div className="stack-sm habit-schedule">
            <dt className="text-secondary">Schedule</dt>
            <dd className="stack-sm">
              <div className="habit-date-range">
                <span><span className="sr-only">Start date: </span><time dateTime={habit.start_date}>{formatDate(habit.start_date)}</time></span>
                <span aria-hidden="true">–</span>
                <span><span className="sr-only">End date: </span>{end ? <time dateTime={end}>{formatDate(end)}</time> : "No end date"}</span>
              </div>
              <p className="text-secondary">{!today ? "Loading time remaining…" : upcoming ? `Starts in ${duration}` : finished ? "0 days remaining" : end ? `${duration} remaining` : "Ongoing"}</p>
            </dd>
          </div>
        </dl>
      </Card>
      {habit.description && (
        <section className="stack-sm" aria-labelledby="habit-description-heading">
          <h2 id="habit-description-heading" className="text-h2">Description</h2>
          <p className="text-body text-secondary habit-description">{habit.description}</p>
        </section>
      )}
    </section>
  )
}
