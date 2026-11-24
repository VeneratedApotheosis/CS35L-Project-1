"use client"

import { BadgePills, BadgeMedal, badgeSummary, shownState } from "@/components/AchievementBadge"
import type { BadgeItem } from "./groups"

function statusText(badge: BadgeItem["badge"]): string {
  const state = shownState(badge)
  if (state === "earned") return badge.earnedOn ? `Earned ${badge.earnedOn}` : "Earned"
  if (state === "in_progress" && badge.progress) return `In progress: ${badge.progress.count} of ${badge.progress.target}`
  return "Not earned yet"
}

/**
 * One badge in a grid: just the badge, with no text. Hovering or focusing it
 * shows a small card, and clicking or tapping it opens the details.
 */
export function BadgeSlot({ item, onOpen }: { item: BadgeItem; onOpen: (id: string) => void }) {
  const { badge } = item
  const state = shownState(badge)
  return (
    <button type="button" className="badge-slot" data-state={state} aria-label={badgeSummary(badge)} onClick={() => onOpen(item.id)}>
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
