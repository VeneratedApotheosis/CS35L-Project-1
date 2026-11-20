"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { DeleteHabitDialog } from "@/components/DeleteHabit"
import { Card } from "@/components/Card"
import { Toast } from "@/components/Toast"
import { ApiError } from "@/lib/api"
import { getHabit, habitKeys } from "@/lib/habits"
import { useProfile } from "@/lib/useProfile"
import { LogDayDialog } from "./garden/LogDayDialog"
import { HabitHeader } from "./habit/HabitHeader"
import { ActivityCalendar } from "./habit/ActivityCalendar"
import { ActivityLog } from "./habit/ActivityLog"
import { HabitPlantCard } from "./habit/HabitPlantCard"
import { OverallCard } from "./habit/OverallCard"
import { ThisPeriodCard } from "./habit/ThisPeriodCard"
import { useHabitLogging } from "./habit/useHabitLogging"

/** Only display data returned by the protected API, cached per account. */
export default function HabitDetails({ id }: { id: string }) {
  const { user, signOut } = useAuth()
  const profile = useProfile()
  const habit = useQuery({
    queryKey: habitKeys.detail(user?.id ?? "signed-out", id),
    queryFn: () => getHabit(id),
    enabled: Boolean(user),
    retry: false,
    refetchInterval: 60_000,
  })
  const logging = useHabitLogging(id, profile.data?.today)
  const [logDateOpen, setLogDateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const status = habit.error instanceof ApiError ? habit.error.status : undefined
  const unavailable = status === 404 || status === 400
  const fatalError = habit.isError && (!habit.data || unavailable || status === 401)
  const today = profile.data?.today

  return (
    <main className="stack-lg habit-details-page">
      {fatalError ? (
        <>
          <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>
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
        </>
      ) : habit.isPending ? (
        <>
          <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>
          <p role="status" className="text-body text-secondary">Loading habit…</p>
        </>
      ) : habit.data ? (
        <>
          <HabitHeader habit={habit.data} onDelete={() => setDeleteOpen(true)} />
          {habit.isError && <p role="alert" className="text-body-sm">Couldn&apos;t refresh the latest details. Your last saved activity is still shown.</p>}
          <div className="habit-grid">
            <HabitPlantCard habit={habit.data} />
            <ThisPeriodCard habit={habit.data} today={today} busy={logging.busy}
              onLogToday={() => { void logging.logToday() }} onLogDate={() => setLogDateOpen(true)} />
            <ActivityCalendar key={habit.data.id} habit={habit.data} today={today} busy={logging.busy}
              onRemove={logging.removeLog} />
            <div className="habit-side">
              <OverallCard habit={habit.data} today={today} />
              <ActivityLog habit={habit.data} today={today} busy={logging.busy} onRemove={logging.removeLog} />
            </div>
          </div>
          <LogDayDialog habit={logDateOpen ? habit.data : null} today={today ?? ""} onSave={logging.logOn}
            onClose={() => setLogDateOpen(false)} />
          <DeleteHabitDialog id={habit.data.id} name={habit.data.name} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
        </>
      ) : null}
      {logging.notice && <Toast key={logging.noticeId} message={logging.notice.message}
        variant={logging.notice.error ? "error" : "success"} onDismiss={logging.dismiss}
        action={!logging.busy && logging.notice.undo ? { label: "Undo", onClick: logging.notice.undo } : undefined} />}
    </main>
  )
}
