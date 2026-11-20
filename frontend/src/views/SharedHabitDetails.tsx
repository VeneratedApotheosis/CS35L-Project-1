"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { HabitPlant } from "@/components/HabitPlant"
import { HabitProgress } from "@/components/HabitProgress"
import { ProgressRing } from "@/components/ProgressRing"
import { ApiError } from "@/lib/api"
import { formatDate, goalSentence } from "@/lib/goal"
import { sharedInviteUrl } from "@/lib/paths"
import { getSharedHabit, sharedHabitKeys, type SharedHabitDetail } from "@/lib/sharedHabits"

const healthLabels = { healthy: "Healthy", slightly_wilted: "Slightly wilted", wilted: "Wilted" }
const percent = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(undefined, {
  style: "percent", maximumFractionDigits: 2,
}).format(value)

export default function SharedHabitDetails({ id }: { id: string }) {
  const { user, signOut } = useAuth()
  const query = useQuery({
    queryKey: sharedHabitKeys.detail(user?.id ?? "signed-out", id),
    queryFn: () => getSharedHabit(id),
    enabled: Boolean(user), retry: false, refetchInterval: 60_000,
  })
  const status = query.error instanceof ApiError ? query.error.status : undefined
  const unavailable = status === 400 || status === 404
  const fatal = query.isError && (!query.data || unavailable || status === 401)

  return <main className="stack-lg habit-details-page">
    <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>
    {fatal ? <Card className="stack-md">
      <div role="alert" className="stack-sm">
        <h1 className="text-h2">{unavailable ? "Shared habit not found" : status === 401 ? "Sign in to see this shared habit" : "Couldn't load this shared habit"}</h1>
        <p>{unavailable ? "This shared habit isn't available to your account."
          : status === 401 ? "Your session has expired. Sign in again to continue." : "Check your connection and try again."}</p>
      </div>
      {!unavailable && (status === 401
        ? <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
        : <Button className="self-start" onClick={() => void query.refetch()} disabled={query.isFetching}>Try again</Button>)}
    </Card> : query.isPending ? <p role="status">Loading shared habit…</p>
      : query.data && user ? <>
        {query.isError && <p role="alert">Couldn&apos;t refresh the latest details. The last loaded values are shown.</p>}
        <SharedHabitContent key={`${user.id}:${id}`} habit={query.data} userId={user.id} />
      </> : null}
  </main>
}

function SharedHabitContent({ habit, userId }: { habit: SharedHabitDetail; userId: string }) {
  const { stats } = habit
  const days = Math.max(0, Math.round((Date.parse(`${stats.end_date}T00:00:00Z`) - Date.parse(`${stats.today}T00:00:00Z`)) / 86_400_000))
  return <>
    <header className="stack-sm">
      <p className="text-eyebrow">Shared habit</p>
      <h1 className="text-h1 garden-name">{habit.name}</h1>
      <p>{goalSentence({ name: habit.name, targetCount: habit.target_count, intervalCount: habit.interval_count,
        intervalUnit: habit.interval_unit, numPeriods: habit.num_periods })}</p>
      {stats.state === "not_started" && <p role="status">Starts on {formatDate(habit.start_date)}.</p>}
    </header>
    <div className="habit-overview">
      <Card className="habit-overview-plant"><HabitPlant habit={habit} /></Card>
      <Card className="habit-info stack-md">
        <h2 className="text-h2">Shared habit details</h2>
        <dl className="habit-info-grid">
          <div className="stack-sm"><dt>Status</dt><dd>{stats.state === "not_started" ? "Not started yet" : stats.state === "expired" ? "Finished" : "Active"}</dd></div>
          <div className="stack-sm"><dt>Members</dt><dd>{habit.members.length} of {habit.max_members}</dd></div>
          <div className="stack-sm"><dt>Start date</dt><dd><time dateTime={habit.start_date}>{formatDate(habit.start_date)}</time></dd></div>
          <div className="stack-sm"><dt>End date</dt><dd><time dateTime={stats.end_date}>{formatDate(stats.end_date)}</time></dd></div>
          <div className="stack-sm"><dt>Time remaining</dt><dd>{days} {days === 1 ? "day" : "days"}</dd></div>
        </dl>
        {habit.description && <p className="habit-description">{habit.description}</p>}
      </Card>
    </div>
    <section className="stack-md" aria-labelledby="shared-group-progress">
      <Card className="stack-lg progress-panel">
        <h2 id="shared-group-progress" className="text-h2">Group progress</h2>
        <div className="progress-panel-top">
          <div className="stack-sm">
            <div className="habit-progress">
              <div className="habit-progress__caption" aria-hidden="true">
                <span>Average activities per member</span><span>{stats.current_period.count}/{stats.current_period.target}</span>
              </div>
              {/* Group averages are fractional. The personal ProgressBar accepts integers only. */}
              <div className="habit-progress__track" role="progressbar" aria-label="Group average this period"
                aria-valuemin={0} aria-valuemax={stats.current_period.target}
                aria-valuenow={Math.min(stats.current_period.count, stats.current_period.target)}
                aria-valuetext={`${stats.current_period.count} of ${stats.current_period.target} activities per member`}>
                <span className="habit-progress__fill" style={{ width: `${Math.min(1, stats.current_period.count / stats.current_period.target) * 100}%` }} />
              </div>
            </div>
            <p>Period {stats.current_period.number} of {stats.current_period.total}</p>
          </div>
          <div className="progress-panel-overall stack-sm">
            <h3 className="progress-panel-label">Group overall progress</h3>
            <ProgressRing label="Group overall progress" value={stats.overall_progress} />
          </div>
        </div>
        <p>Each member contributes to the group average. Plant health: {healthLabels[stats.health]}.</p>
      </Card>
    </section>
    <HabitProgress stats={habit.own_stats} heading="Your progress" headingId="shared-own-progress" />
    <section className="stack-md" aria-labelledby="shared-members-heading">
      <h2 id="shared-members-heading" className="text-h2">{stats.state === "not_started" ? "Who has joined" : "Members"}</h2>
      <div className="shared-members-scroll">
        <table className="shared-members">
          <caption className="sr-only">Member progress summaries</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Progress</th><th scope="col">Period count</th><th scope="col">Streak</th><th scope="col">Health</th></tr></thead>
          <tbody>{habit.members.map((member) => <tr key={member.user_id}>
            <th scope="row">{member.display_name ?? "Garden member"}{member.is_owner && " (owner)"}{member.user_id === userId && " (you)"}</th>
            <td>{percent(member.overall_progress)}</td>
            <td>{member.current_period_count}/{habit.target_count}</td>
            <td>{member.streak} {member.streak === 1 ? "period" : "periods"}</td>
            <td>{healthLabels[member.health]}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
    <SharedInvite key={habit.join_code} habit={habit} />
  </>
}

function SharedInvite({ habit }: { habit: SharedHabitDetail }) {
  const [message, setMessage] = useState("")
  // Window is read only on interaction: this page is also prerendered for Pages.
  async function copyInvite() {
    if (!habit.join_code) return
    try {
      await navigator.clipboard.writeText(sharedInviteUrl(window.location.origin, habit.join_code))
      setMessage("Invite link copied.")
    } catch {
      setMessage("Couldn't copy automatically. Open the invite link and copy its address.")
    }
  }
  return <Card className="stack-md">
    <h2 className="text-h2">Invite friends</h2>
    {habit.join_code ? <>
      <p>Join by {formatDate(habit.join_by)}.</p>
      <Link href={`/join?code=${encodeURIComponent(habit.join_code)}`}>Open invite link</Link>
      <Button className="self-start" onClick={() => void copyInvite()}>Copy invite link</Button>
      {message && <p role="status">{message}</p>}
    </> : <p>Joining is closed.</p>}
  </Card>
}
