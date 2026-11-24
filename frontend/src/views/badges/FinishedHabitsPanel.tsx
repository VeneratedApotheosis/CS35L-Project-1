"use client"

import { useState } from "react"
import Link from "next/link"
import { Medal } from "lucide-react"
import { BadgeMedal, tierLabels } from "@/components/AchievementBadge"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Modal } from "@/components/Modal"
import { durationPhrase, formatDate, periodPhrase } from "@/lib/goal"
import { habitSeed } from "@/pottedPlant/habitSeed"
import { plantTypeById } from "@/pottedPlant/plants/plantTypes"
import { wiltForHealth } from "@/pottedPlant/plants/staged/wilt"
import type { PlaceholderHabitBadge } from "./placeholderBadges"

const healthLabels = { healthy: "Healthy", slightly_wilted: "Slightly wilted", wilted: "Wilted" } as const
const percent = (rate: number) => new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 }).format(rate)
const goalText = (habit: PlaceholderHabitBadge) => {
  const times = `${habit.targetCount} ${habit.targetCount === 1 ? "time" : "times"}`
  return `${times} ${periodPhrase(habit.intervalCount, habit.intervalUnit)}, ${durationPhrase(habit.intervalCount, habit.intervalUnit, habit.numPeriods)}`
}

function HabitPlant({ habit, className }: { habit: PlaceholderHabitBadge; className: string }) {
  const plant = plantTypeById(habit.plantType)
  if (!plant) return null
  return (
    <div className={className} aria-hidden="true">
      <plant.Preview seed={habitSeed(habit.id)} stage={habit.finalStage} wilt={wiltForHealth(habit.finalHealth)} />
    </div>
  )
}

/** One badge per finished habit that earned one: its plant, its level and when it ended. Opens the details. */
export function FinishedHabitsPanel({ habits }: { habits: PlaceholderHabitBadge[] }) {
  // The dialog keeps showing the last habit while it closes, so its content does not vanish mid-close.
  const [shown, setShown] = useState<PlaceholderHabitBadge | null>(null)
  const [open, setOpen] = useState(false)

  if (habits.length === 0) {
    return (
      <Card className="stack-md habit-badge-empty">
        <h2 className="text-h2">No badges from finished habits yet</h2>
        <p className="text-body text-secondary">When a habit ends with at least 60% of its goal done, it earns a Bronze, Silver or Gold badge and shows up here. Keep growing at your own pace.</p>
        <Link href="/" className="button button--primary button--md self-start">Back to my garden</Link>
      </Card>
    )
  }

  return (
    <div className="stack-md">
      <p className="text-body-sm text-secondary">One badge for each habit you finished. Open one to see how it went.</p>
      <ul className="badge-grid" role="list">
        {habits.map((habit) => (
          <li key={habit.id} className="badge-grid__item">
            <button type="button" className="card habit-badge" data-level={habit.level} onClick={() => { setShown(habit); setOpen(true) }}
              aria-label={`${habit.name}. ${tierLabels[habit.level]} badge. Finished ${formatDate(habit.endDate)}. Show details`}>
              <BadgeMedal tier={habit.level} size="sm" art={{ icon: Medal }} className="habit-badge__medal" />
              <HabitPlant habit={habit} className="habit-badge__plant" />
              <span className="habit-badge__text">
                <span className="text-h3 habit-badge__name">{habit.name}</span>
                <span className="text-body-sm text-secondary">Finished {formatDate(habit.endDate)}</span>
              </span>
              <span className="badge-pill" data-tier={habit.level}><span className="badge-pill__dot" />{tierLabels[habit.level]}</span>
            </button>
          </li>
        ))}
      </ul>

      <Modal open={open} onClose={() => setOpen(false)} title={shown?.name ?? "Badge"}
        description={shown ? `${tierLabels[shown.level]} badge, finished ${formatDate(shown.endDate)}.` : undefined}>
        {shown && (
          <div className="stack-lg habit-badge-detail">
            <div className="habit-badge-detail__top">
              <BadgeMedal tier={shown.level} size="lg" art={{ icon: Medal }} />
              <HabitPlant habit={shown} className="habit-badge-detail__plant" />
            </div>
            <dl className="habit-badge-detail__facts">
              <div><dt className="text-caption text-secondary">Goal</dt><dd className="text-body">{goalText(shown)}</dd></div>
              <div><dt className="text-caption text-secondary">Final progress</dt><dd className="text-body">{percent(shown.progress)}</dd></div>
              <div><dt className="text-caption text-secondary">Final consistency</dt><dd className="text-body">{percent(shown.consistency)}</dd></div>
              <div><dt className="text-caption text-secondary">Total activities</dt><dd className="text-body">{shown.totalActivities}</dd></div>
              <div><dt className="text-caption text-secondary">Final plant</dt><dd className="text-body">Stage {shown.finalStage}, {healthLabels[shown.finalHealth].toLowerCase()}</dd></div>
              <div><dt className="text-caption text-secondary">Badge level</dt><dd className="text-body">{tierLabels[shown.level]}</dd></div>
            </dl>
            <Button className="self-end" onClick={() => setOpen(false)}>Close</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
