"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, CalendarRange, Check, Gauge, Users } from "lucide-react"
import { Button } from "@/components/Button"
import { getHabit, habitKeys, type HabitWithStats } from "@/lib/habits"
import { habitHref, sharedHabitHref } from "@/lib/paths"
import { shortDate, unitWord } from "./HabitCard"
import type { SharedInfo } from "./GardenPlant"

export interface HabitActionsProps {
  habit: HabitWithStats
  userId: string
  /** Set for a shared habit: its facts are the people and the period, and its only buttons are View details and Close. */
  shared?: SharedInfo
  canLog: boolean
  loggingDisabled: boolean
  onLogToday: () => void
  onLogAnotherDay: () => void
  onDelete: () => void
  onClose: () => void
}

/**
 * The column a click adds beside a plant's hover card. At the top, three short blocks (a label over a bigger value) of what the card
 * does not say: how far into the habit it is (week 2 of 8), the consistency and the start date. At
 * the bottom, the buttons: Log today, Choose date, View details, Delete habit and Close. Together they
 * must fit the card's height (about 400px), so keep this short.
 */
export function HabitActions({ habit, userId, shared, canLog, loggingDisabled, onLogToday, onLogAnotherDay, onDelete, onClose }: HabitActionsProps) {
  // The consistency is not in the list, so it comes with the detail the card already fetched (same key).
  const detail = useQuery({
    queryKey: habitKeys.detail(userId, habit.id),
    queryFn: () => getHabit(habit.id),
    enabled: !shared,
    retry: false,
    staleTime: 30_000,
  })
  const { number, total } = habit.stats.current_period
  const word = unitWord(habit)
  const rate = detail.data?.stats?.consistency?.rate
  const consistency = detail.data === undefined ? "…" : rate === null || rate === undefined ? "None yet" : `${Math.round(rate * 100)}%`
  const where = habit.stats.state === "not_started" ? "Not started" : `${word[0].toUpperCase()}${word.slice(1)} ${number}${total === null ? "" : ` of ${total}`}`

  return (
    <div className="garden-card__side">
      <dl className="garden-card__facts">
        {shared && <div><dt><Users size={14} aria-hidden="true" />Members</dt><dd>{shared.members} of {shared.max}</dd></div>}
        <div><dt><CalendarRange size={14} aria-hidden="true" />Progress</dt><dd>{where}</dd></div>
        {!shared && <div><dt><Gauge size={14} aria-hidden="true" />Consistency</dt><dd>{consistency}</dd></div>}
        <div><dt><CalendarDays size={14} aria-hidden="true" />Started</dt><dd>{shortDate(habit.start_date)}</dd></div>
      </dl>
      <div className="garden-card__actions">
        {canLog && <Button full icon={Check} disabled={loggingDisabled} onClick={onLogToday}>Log today</Button>}
        {canLog && <Button variant="secondary" disabled={loggingDisabled} onClick={onLogAnotherDay}>Choose date</Button>}
        <Link className="button button--secondary button--md" href={shared ? sharedHabitHref(habit.id) : habitHref(habit.id)}>View details</Link>
        <div className="garden-card__foot">
          {!shared && <Button variant="ghost" size="sm" className="garden-card__delete" onClick={onDelete}>Delete habit</Button>}
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
