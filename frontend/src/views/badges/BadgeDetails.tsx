"use client"

import { ChevronLeft, ChevronRight, Medal } from "lucide-react"
import { BadgeMedal, BadgePills, shownState, tierLabels } from "@/components/AchievementBadge"
import { Button } from "@/components/Button"
import { Modal } from "@/components/Modal"
import { durationPhrase, formatDate, periodPhrase } from "@/lib/goal"
import { habitSeed } from "@/pottedPlant/habitSeed"
import { plantTypeById } from "@/pottedPlant/plants/plantTypes"
import { wiltForHealth } from "@/pottedPlant/plants/staged/wilt"
import type { BookItem } from "./bookPages"
import type { PlaceholderHabitBadge } from "./placeholderBadges"

const healthLabels = { healthy: "Healthy", slightly_wilted: "Slightly wilted", wilted: "Wilted" } as const
const percent = (rate: number) => new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 }).format(rate)
const goalText = (habit: PlaceholderHabitBadge) => {
  const times = `${habit.targetCount} ${habit.targetCount === 1 ? "time" : "times"}`
  return `${times} ${periodPhrase(habit.intervalCount, habit.intervalUnit)}, ${durationPhrase(habit.intervalCount, habit.intervalUnit, habit.numPeriods)}`
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-caption text-secondary">{label}</dt><dd className="text-body">{children}</dd></div>
}

/** The details of one badge, with buttons to step to the next or previous badge in the book. */
export function BadgeDetails({ items, index, open, onClose, onStep }: {
  items: BookItem[]
  /** The badge shown. Kept while the dialog closes so its content does not vanish mid-close. */
  index: number
  open: boolean
  onClose: () => void
  onStep: (delta: -1 | 1) => void
}) {
  const item = items[index]
  if (!item) return null

  const title = item.kind === "habit" ? item.habit.name : item.badge.name
  const description = item.kind === "habit"
    ? `${tierLabels[item.habit.level]} badge, finished ${formatDate(item.habit.endDate)}.`
    : item.badge.description

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="stack-lg badge-details">
        {item.kind === "badge" ? (() => {
          const { badge } = item
          const state = shownState(badge)
          return (
            <>
              <div className="badge-details__top">
                <BadgeMedal tier={badge.tier} state={state} secret={badge.secret} size="lg" art={badge.art}
                  progress={badge.progress ? badge.progress.count / badge.progress.target : 0} />
                <div className="stack-sm badge-details__status">
                  <p className="badge-details__pills"><BadgePills tier={badge.tier} secret={badge.secret} /></p>
                  {state === "earned" && <p className="text-body">Earned {badge.earnedOn ?? ""}</p>}
                  {state === "in_progress" && badge.progress && (
                    <div className="stack-sm">
                      <p className="text-body">{badge.progress.count} of {badge.progress.target}</p>
                      <div className="badge-details__bar" role="progressbar" aria-label={`${badge.name} progress`} aria-valuemin={0}
                        aria-valuemax={badge.progress.target} aria-valuenow={Math.min(badge.progress.count, badge.progress.target)}>
                        <span style={{ width: `${Math.min(100, (badge.progress.count / badge.progress.target) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                  {state === "locked" && <p className="text-body text-secondary">Not earned yet</p>}
                </div>
              </div>
            </>
          )
        })() : (() => {
          const { habit } = item
          const plant = plantTypeById(habit.plantType)
          return (
            <>
              <div className="badge-details__top">
                <BadgeMedal tier={habit.level} size="lg" art={{ icon: Medal }} />
                {plant && (
                  <div className="badge-details__plant" aria-hidden="true">
                    <plant.Preview seed={habitSeed(habit.id)} stage={habit.finalStage} wilt={wiltForHealth(habit.finalHealth)} />
                  </div>
                )}
              </div>
              <dl className="badge-details__facts">
                <Fact label="Goal">{goalText(habit)}</Fact>
                <Fact label="Final progress">{percent(habit.progress)}</Fact>
                <Fact label="Final consistency">{percent(habit.consistency)}</Fact>
                <Fact label="Total activities">{habit.totalActivities}</Fact>
                <Fact label="Final plant">Stage {habit.finalStage}, {healthLabels[habit.finalHealth].toLowerCase()}</Fact>
                <Fact label="Badge level">{tierLabels[habit.level]}</Fact>
              </dl>
            </>
          )
        })()}
        <div className="badge-details__actions">
          <Button variant="secondary" icon={ChevronLeft} disabled={index === 0} onClick={() => onStep(-1)}>Previous badge</Button>
          <Button variant="secondary" icon={ChevronRight} iconPosition="end" disabled={index === items.length - 1} onClick={() => onStep(1)}>Next badge</Button>
        </div>
      </div>
    </Modal>
  )
}
