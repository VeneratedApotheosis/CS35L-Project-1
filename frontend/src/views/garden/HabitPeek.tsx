"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, Check, Flame, Heart, X } from "lucide-react"
import { Button } from "@/components/Button"
import { ProgressBar } from "@/components/ProgressBar"
import { durationPhrase, periodPhrase } from "@/lib/goal"
import { getHabit, habitKeys, type HabitWithStats } from "@/lib/habits"
import { habitHref } from "@/lib/paths"
import { encouragement, progressTitle, shortDate, unitWord } from "./HabitCard"

const healthLabels = { healthy: "Healthy", slightly_wilted: "Slightly wilted", wilted: "Wilted" } as const

export interface HabitPeekProps {
  habit: HabitWithStats
  userId: string
  canLog: boolean
  loggingDisabled: boolean
  onLogToday: () => void
  onLogAnotherDay: () => void
  onDelete: () => void
  onClose: () => void
}

/**
 * What opens when a plant is clicked, beside the plant's hover card, which stays open and is not
 * covered. From the top: the name and goal with a close button, the period's progress, health, streak
 * and start date, then the actions: Log today, Choose date, View details and Delete habit.
 *
 * It is not a modal: a press anywhere outside it, or Escape, closes it. A press on a plant's own
 * button is left to that plant, which opens its panel (or closes this one, if it is the same plant).
 * On a phone it is a card at the bottom of the screen (see garden.css).
 */
export function HabitPeek({ habit, userId, canLog, loggingDisabled, onLogToday, onLogAnotherDay, onDelete, onClose }: HabitPeekProps) {
  const box = useRef<HTMLDivElement>(null)
  const detail = useQuery({
    queryKey: habitKeys.detail(userId, habit.id),
    queryFn: () => getHabit(habit.id),
    retry: false,
    staleTime: 30_000,
  })

  useEffect(() => {
    box.current?.querySelector<HTMLElement>("button, a")?.focus()
    function outside(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (box.current?.contains(target) || target.closest(".garden-plant__hit")) return
      onClose()
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", escape)
    }
  }, [onClose])

  const goal = `${habit.target_count} ${habit.target_count === 1 ? "time" : "times"} ${periodPhrase(habit.interval_count, habit.interval_unit)}` +
    (habit.num_periods !== null ? ` ${durationPhrase(habit.interval_count, habit.interval_unit, habit.num_periods)}` : "")
  const { count, target } = habit.stats.current_period
  const streak = detail.data?.stats?.streak
  const unit = unitWord(habit)

  return (
    <div ref={box} className="garden-pop garden-peek" role="dialog" aria-label={habit.name}>
      <div className="garden-peek__head">
        <div className="garden-peek__title">
          <h3 className="garden-peek__name" title={habit.name}>{habit.name}</h3>
          <p className="garden-peek__sub">{goal}</p>
        </div>
        <Button variant="ghost" size="sm" icon={X} aria-label="Close" onClick={onClose} />
      </div>

      <hr className="garden-peek__rule" />

      <div className="garden-peek__progress">
        <ProgressBar label={`${habit.name}: current period`} caption={progressTitle(habit)} count={count} target={target} />
        <p className="garden-peek__note">{encouragement(habit)}</p>
      </div>

      <hr className="garden-peek__rule" />

      <dl className="garden-peek__facts">
        <div>
          <dt><Heart size={14} aria-hidden="true" />Health</dt>
          <dd>{healthLabels[habit.stats.health]}</dd>
        </div>
        <div>
          <dt><Flame size={14} aria-hidden="true" />Streak</dt>
          <dd>{streak === undefined ? "…" : `${streak} ${unit}${streak === 1 ? "" : "s"}`}</dd>
        </div>
        <div>
          <dt><CalendarDays size={14} aria-hidden="true" />Started</dt>
          <dd>{shortDate(habit.start_date)}</dd>
        </div>
      </dl>

      <div className="garden-peek__actions">
        {canLog && <Button full icon={Check} disabled={loggingDisabled} onClick={onLogToday}>Log today</Button>}
        <div className="garden-peek__pair">
          {canLog && <Button variant="secondary" disabled={loggingDisabled} onClick={onLogAnotherDay}>Choose date</Button>}
          <Link className="button button--secondary button--md" href={habitHref(habit.id)}>View details</Link>
        </div>
        <Button variant="ghost" size="sm" className="garden-peek__delete" onClick={onDelete}>Delete habit</Button>
      </div>
    </div>
  )
}
