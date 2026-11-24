"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Toast } from "@/components/Toast"
import { ApiError } from "@/lib/api"
import { formatDate } from "@/lib/goal"
import type { HabitDetail } from "@/lib/habits"
import { sharedInviteUrl } from "@/lib/paths"
import { getSharedHabit, sharedHabitKeys, type SharedHabitDetail } from "@/lib/sharedHabits"
import { LogDayDialog } from "./garden/LogDayDialog"
import { ActivityCalendar } from "./habit/ActivityCalendar"
import { ActivityLog } from "./habit/ActivityLog"
import { HabitHeader } from "./habit/HabitHeader"
import { HabitPlantCard } from "./habit/HabitPlantCard"
import { OverallCard } from "./habit/OverallCard"
import { ThisPeriodCard } from "./habit/ThisPeriodCard"
import { useHabitLogging } from "./habit/useHabitLogging"
import { SharedHabitActions } from "./SharedHabitActions"

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
    {(fatal || query.isPending) && <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>}
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
        <SharedHabitContent key={`${user.id}:${id}`} habit={query.data} userId={user.id} refreshFailed={query.isError} />
      </> : null}
  </main>
}

/** The habit as its member sees it: their own stats stand where a personal habit's do, so the personal cards can show them. */
function ownView(habit: SharedHabitDetail): HabitDetail {
  return { ...habit, stats: habit.own_stats }
}

function SharedHabitContent({ habit, userId, refreshFailed }: { habit: SharedHabitDetail; userId: string; refreshFailed: boolean }) {
  const { stats } = habit
  const own = ownView(habit)
  // Logging and its limits use the member's own date (their saved membership timezone), not the group's.
  const today = habit.own_today
  const logging = useHabitLogging(habit.id, today, true)
  const [logDateOpen, setLogDateOpen] = useState(false)
  return <>
    <HabitHeader habit={habit} />
    {refreshFailed && <p role="alert" className="text-body-sm">Couldn&apos;t refresh the latest details. The last loaded values are shown.</p>}
    <div className="habit-grid">
      <HabitPlantCard habit={habit} stats={stats} />
      <ThisPeriodCard habit={own} group={{ count: stats.current_period.count, target: stats.current_period.target }}
        today={today} busy={logging.busy}
        onLogToday={() => { void logging.logToday() }} onLogDate={() => setLogDateOpen(true)} />
      <ActivityCalendar key={habit.id} habit={own} today={today} busy={logging.busy} onRemove={logging.removeLog} />
      <div className="habit-side">
        <OverallCard habit={own} today={today} members={{ count: habit.members.length, max: habit.max_members }} />
        <ActivityLog habit={own} today={today} busy={logging.busy} onRemove={logging.removeLog} />
      </div>
    </div>
    <div className="habit-below">
      <SharedMembers habit={habit} userId={userId} />
      <SharedInvite key={habit.join_code} habit={habit} />
    </div>
    <SharedHabitActions habit={habit} userId={userId} busy={logging.busy} />
    <LogDayDialog habit={logDateOpen ? own : null} today={today} onSave={logging.logOn} onClose={() => setLogDateOpen(false)} />
    {logging.notice && <Toast key={logging.noticeId} message={logging.notice.message}
      variant={logging.notice.error ? "error" : "success"} onDismiss={logging.dismiss}
      action={!logging.busy && logging.notice.undo ? { label: "Undo", onClick: logging.notice.undo } : undefined} />}
  </>
}

/** Every member's summary: a table on a wide screen and a list on a phone (the stylesheet shows one). Never their log dates. */
function SharedMembers({ habit, userId }: { habit: SharedHabitDetail; userId: string }) {
  const unit = (count: number) => `${count} ${count === 1 ? "period" : "periods"}`
  const name = (member: SharedHabitDetail["members"][number]) => <>
    {member.display_name ?? "Garden member"}
    {member.is_owner && <span className="habit-members__tag"> (owner)</span>}
    {member.user_id === userId && <span className="habit-members__tag"> (you)</span>}
  </>
  return <section className="habit-card habit-members" aria-labelledby="shared-members-heading">
    <h2 id="shared-members-heading" className="habit-members__title">{habit.stats.state === "not_started" ? "Who has joined" : "Members"}</h2>
    <div className="habit-members__scroll">
      <table className="habit-members__table">
        <caption className="sr-only">Member progress summaries</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">Progress</th><th scope="col">Period count</th><th scope="col">Streak</th><th scope="col">Health</th></tr></thead>
        <tbody>{habit.members.map((member) => <tr key={member.user_id}>
          <th scope="row">{name(member)}</th>
          <td>{percent(member.overall_progress)}</td>
          <td>{member.current_period_count}/{habit.target_count}</td>
          <td>{unit(member.streak)}</td>
          <td>{healthLabels[member.health]}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="habit-members__list" aria-label="Member progress summaries">
      {habit.members.map((member) => <li key={member.user_id}>
        <span className="habit-members__name">{name(member)}</span>
        <span className="habit-members__health">{healthLabels[member.health]}</span>
        <p className="habit-members__stats">
          {percent(member.overall_progress)} overall · {member.current_period_count}/{habit.target_count} this period · {unit(member.streak)} streak
        </p>
      </li>)}
    </ul>
  </section>
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
  return <section className="habit-card habit-invite" aria-labelledby="shared-invite-heading">
    <h2 id="shared-invite-heading" className="habit-invite__title">Invite friends</h2>
    {habit.join_code ? <>
      <p className="habit-invite__deadline">Join by {formatDate(habit.join_by)}.</p>
      <div className="habit-invite__actions">
        <Button onClick={() => void copyInvite()}>Copy invite link</Button>
        <Link className="habit-invite__link" href={`/join?code=${encodeURIComponent(habit.join_code)}`}>Open invite link</Link>
      </div>
      {message && <p role="status" className="text-body-sm">{message}</p>}
    </> : <p className="habit-invite__deadline">Joining is closed.</p>}
  </section>
}
