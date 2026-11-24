"use client"

import { Medal } from "lucide-react"
import { BadgeMedal, BadgePills, badgeSummary, shownState, tierLabels } from "@/components/AchievementBadge"
import { formatDate } from "@/lib/goal"
import { habitSeed } from "@/pottedPlant/habitSeed"
import { plantTypeById } from "@/pottedPlant/plants/plantTypes"
import { wiltForHealth } from "@/pottedPlant/plants/staged/wilt"
import type { BookItem } from "./bookPages"

/** Columns on a page, used to put the hover card below the top row instead of above it. */
const COLUMNS = 4

function statusText(badge: Extract<BookItem, { kind: "badge" }>["badge"]): string {
  const state = shownState(badge)
  if (state === "earned") return badge.earnedOn ? `Earned ${badge.earnedOn}` : "Earned"
  if (state === "in_progress" && badge.progress) return `In progress: ${badge.progress.count} of ${badge.progress.target}`
  return "Not earned yet"
}

/**
 * One slot on a page: just the badge, with no text. Hovering or focusing it
 * shows a small card, and clicking or tapping it opens the details.
 */
export function BadgeSlot({ item, index, onOpen }: { item: BookItem; index: number; onOpen: (id: string) => void }) {
  const row = Math.floor(index / COLUMNS)

  if (item.kind === "habit") {
    const { habit } = item
    const plant = plantTypeById(habit.plantType)
    const label = `${habit.name}. ${tierLabels[habit.level]} badge. Finished ${formatDate(habit.endDate)}.`
    return (
      <button type="button" className="badge-slot badge-slot--habit" data-row={row} aria-label={label} onClick={() => onOpen(item.id)}>
        <span className="badge-slot__frame" aria-hidden="true">
          {plant && <plant.Preview seed={habitSeed(habit.id)} stage={habit.finalStage} wilt={wiltForHealth(habit.finalHealth)} />}
          <BadgeMedal tier={habit.level} size="sm" art={{ icon: Medal }} className="badge-slot__level" />
        </span>
        <span className="badge-slot__tip" aria-hidden="true">
          <strong className="text-body-sm">{habit.name}</strong>
          <span className="badge-slot__tip-row"><BadgePills tier={habit.level} /></span>
          <span className="text-caption text-secondary">Finished {formatDate(habit.endDate)}</span>
        </span>
      </button>
    )
  }

  const { badge } = item
  const state = shownState(badge)
  return (
    <button type="button" className="badge-slot" data-state={state} data-row={row} aria-label={badgeSummary(badge)} onClick={() => onOpen(item.id)}>
      <BadgeMedal tier={badge.tier} state={state} secret={badge.secret} art={badge.art}
        progress={badge.progress ? badge.progress.count / badge.progress.target : 0} />
      <span className="badge-slot__tip" aria-hidden="true">
        <strong className="text-body-sm">{badge.name}</strong>
        <span className="badge-slot__tip-row"><BadgePills tier={badge.tier} secret={badge.secret} /></span>
        <span className="text-caption text-secondary">{badge.description}</span>
        <span className="text-caption">{statusText(badge)}</span>
      </span>
    </button>
  )
}

/** A dashed circle where a finished habit's badge will go. Decorative. */
export function EmptySlot() {
  return <li className="badge-slot badge-slot--empty" aria-hidden="true"><span /></li>
}
