"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { BadgeMedal, BadgePills, shownState } from "@/components/AchievementBadge"
import { Button } from "@/components/Button"
import { Modal } from "@/components/Modal"
import type { BadgeItem } from "./groups"

/** The details of one badge, with buttons to step to the next or previous badge on screen. */
export function BadgeDetails({ items, index, open, onClose, onStep }: {
  items: BadgeItem[]
  /** The badge shown. Kept while the dialog closes so its content does not vanish mid-close. */
  index: number
  open: boolean
  onClose: () => void
  onStep: (delta: -1 | 1) => void
}) {
  const item = items[index]
  if (!item) return null
  const { badge } = item
  const state = shownState(badge)

  return (
    <Modal open={open} onClose={onClose} title={badge.name} description={badge.description}>
      <div className="stack-lg badge-details">
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
        <div className="badge-details__actions">
          <Button variant="secondary" icon={ChevronLeft} disabled={index === 0} onClick={() => onStep(-1)}>Previous badge</Button>
          <Button variant="secondary" icon={ChevronRight} iconPosition="end" disabled={index === items.length - 1} onClick={() => onStep(1)}>Next badge</Button>
        </div>
      </div>
    </Modal>
  )
}
