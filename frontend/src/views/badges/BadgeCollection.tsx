"use client"

import { useId, useState } from "react"
import { Eye, EyeOff, Sprout } from "lucide-react"
import { BadgeMedal, tierLabels, type BadgeTier } from "@/components/AchievementBadge"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { BadgeDetails } from "./BadgeDetails"
import { BadgeSlot } from "./BadgeSlot"
import { isEarned, isLocked, type BadgeGroup } from "./groups"

const tiers: BadgeTier[] = ["bronze", "silver", "gold", "platinum"]

/** A titled group of badges: a rule, a small heading with its earned count, then a compact grid of slots. */
function Group({ group, hideLocked, onOpen }: { group: BadgeGroup; hideLocked: boolean; onOpen: (id: string) => void }) {
  const headingId = useId()
  const items = hideLocked ? group.items.filter((item) => !isLocked(item)) : group.items
  // A group with nothing left to show is dropped.
  if (items.length === 0) return null

  const earned = group.items.filter(isEarned).length
  const count = group.id === "secret" ? `${earned}` : `${earned}/${group.items.length}`
  return (
    <section className="badge-group" aria-labelledby={headingId}>
      <h2 className="text-h3 badge-group__title" id={headingId}>{group.title}<span className="badge-group__count">{count}</span></h2>
      <ul className="badge-grid" role="list">
        {items.map((item) => <li key={item.id} className="badge-grid__cell"><BadgeSlot item={item} onOpen={onOpen} /></li>)}
      </ul>
    </section>
  )
}

/**
 * The Badges page body (#253), modelled on how osu! shows medals: a count, then
 * groups of medals under small headings. Slots hold only the badge. Hover or
 * focus shows a small card, and click or tap opens the details. See
 * docs/frontend/screens.md.
 */
export function BadgeCollection({ groups }: { groups: BadgeGroup[] }) {
  const [hideLocked, setHideLocked] = useState(false)
  const [detail, setDetail] = useState<{ id: string; open: boolean }>({ id: "", open: false })

  const all = groups.flatMap((group) => group.items)
  const earned = all.filter(isEarned)

  // The dialog steps through what is on screen, in page order.
  const shown = hideLocked ? all.filter((item) => !isLocked(item)) : all
  const index = Math.max(0, shown.findIndex((item) => item.id === detail.id))
  const open = (id: string) => setDetail({ id, open: true })

  return (
    <div className="stack-lg">
      <Card className="badge-summary">
        <div className="badge-summary__top">
          <h2 className="text-h2">{earned.length} of {all.length} earned</h2>
          <ul className="badge-summary__tiers" role="list" aria-label="Earned badges by tier">
            {tiers.map((tier) => (
              <li key={tier} className="badge-summary__tier">
                <BadgeMedal tier={tier} size="sm" art={{ icon: Sprout }} state={earned.some((item) => item.badge.tier === tier) ? "earned" : "locked"} />
                <span className="stack-sm badge-summary__tier-text">
                  <strong>{earned.filter((item) => item.badge.tier === tier).length}</strong>
                  <span className="text-caption text-muted">{tierLabels[tier]}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className="badge-toolbar">
        <Button size="sm" variant={hideLocked ? "primary" : "secondary"} icon={hideLocked ? EyeOff : Eye} aria-pressed={hideLocked} onClick={() => setHideLocked((value) => !value)}>
          Hide locked
        </Button>
      </div>

      {groups.map((group) => <Group key={group.id} group={group} hideLocked={hideLocked} onOpen={open} />)}

      <BadgeDetails items={shown} index={index} open={detail.open} onClose={() => setDetail((value) => ({ ...value, open: false }))}
        onStep={(delta) => setDetail({ id: shown[Math.min(Math.max(index + delta, 0), shown.length - 1)]?.id ?? "", open: true })} />
    </div>
  )
}
