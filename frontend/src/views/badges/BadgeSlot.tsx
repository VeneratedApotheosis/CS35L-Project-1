"use client"

import { useRef, useState } from "react"
import { BadgePills, BadgeMedal, badgeSummary, shownState } from "@/components/AchievementBadge"
import type { BadgeItem } from "./groups"

/** Gap between the slot and its card, matching `--space-1`. */
const TIP_GAP = 4
/** Used when the card cannot be measured yet. */
const FALLBACK_TIP_HEIGHT = 160

export type TipPlacement = "below" | "above"

/**
 * Where the hover card goes: below the slot unless it would run past the bottom
 * of the window (which also grows the page on the last row) while there is room
 * above.
 */
export function tipPlacement(slot: { top: number; bottom: number }, tipHeight: number, viewportHeight: number): TipPlacement {
  const height = tipHeight > 0 ? tipHeight : FALLBACK_TIP_HEIGHT
  const fitsBelow = slot.bottom + TIP_GAP + height <= viewportHeight
  const fitsAbove = slot.top - TIP_GAP - height >= 0
  return !fitsBelow && fitsAbove ? "above" : "below"
}

function statusText(badge: BadgeItem["badge"]): string {
  const state = shownState(badge)
  if (state === "earned") return badge.earnedOn ? `Earned ${badge.earnedOn}` : "Earned"
  if (state === "in_progress" && badge.progress) return `In progress: ${badge.progress.count} of ${badge.progress.target}`
  return "Not earned yet"
}

/**
 * One badge in a grid: just the badge, with no text. Hovering or focusing it
 * shows a small card (above the badge when there is no room below), and
 * clicking or tapping it opens the details.
 */
export function BadgeSlot({ item, onOpen }: { item: BadgeItem; onOpen: (id: string) => void }) {
  const { badge } = item
  const state = shownState(badge)
  const slotRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const [placement, setPlacement] = useState<TipPlacement>("below")

  function place() {
    const slot = slotRef.current
    if (!slot) return
    const tipHeight = tipRef.current?.getBoundingClientRect().height ?? 0
    setPlacement(tipPlacement(slot.getBoundingClientRect(), tipHeight, window.innerHeight))
  }

  return (
    <button ref={slotRef} type="button" className="badge-slot" data-state={state} data-tip={placement}
      aria-label={badgeSummary(badge)} onClick={() => onOpen(item.id)} onPointerEnter={place} onFocus={place}>
      <BadgeMedal tier={badge.tier} state={state} secret={badge.secret} art={badge.art}
        progress={badge.progress ? badge.progress.count / badge.progress.target : 0} />
      <span ref={tipRef} className="badge-slot__tip" aria-hidden="true">
        <strong className="text-body-sm">{badge.name}</strong>
        <span className="badge-slot__tip-row"><BadgePills tier={badge.tier} secret={badge.secret} /></span>
        <span className="text-caption text-secondary">{badge.description}</span>
        <span className="text-caption">{statusText(badge)}</span>
      </span>
    </button>
  )
}
