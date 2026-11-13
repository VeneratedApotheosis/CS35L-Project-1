"use client"

import Link from "next/link"
import { useHoldToLog } from "./useHoldToLog"
import { useEffect, useId, useRef } from "react"
import { CircleAlert, Droplet, Ellipsis, Eye, Leaf, Plus } from "lucide-react"
import { plantTypeById, type PlantTypeId } from "@/pottedPlant/plants/plantTypes"
import { Button } from "./Button"
import { Card } from "./Card"
import { Icon } from "./Icon"
import { ProgressBar } from "./ProgressBar"

const healthStates = {
  healthy: { label: "Healthy", icon: Leaf },
  slightly_wilted: { label: "Slightly wilted", icon: Droplet },
  wilted: { label: "Wilted", icon: CircleAlert },
} as const

export type PlantHealth = keyof typeof healthStates

export interface PlantCardProps {
  name: string
  plantType: PlantTypeId
  seed: number
  stage: 1 | 2 | 3 | 4
  /** Already calculated by the backend; the card doesn't compute habit stats. */
  health: PlantHealth
  count: number
  target: number
  /** For example, "This week" or "This month". */
  periodLabel: string
  periodStart?: string
  periodEnd?: string
  onLogActivity?: () => void
  loggingDisabled?: boolean
  onViewDetails?: () => void
  detailsHref?: string
}

/** A presentation-only garden item. The parent supplies data and owns all actions. */
export function PlantCard({
  name, plantType, seed, stage, health, count, target, periodLabel,
  onLogActivity, onViewDetails, detailsHref, loggingDisabled = false, periodStart, periodEnd,
}: PlantCardProps) {
  const hold = useHoldToLog(loggingDisabled ? undefined : onLogActivity)
  const headingId = useId()
  // API period ends are exclusive; show the last included calendar day.
  const end = periodEnd ? new Date(`${periodEnd}T00:00:00Z`) : null
  if (end) end.setUTCDate(end.getUTCDate() - 1)
  const shortDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  const caption = periodStart && end
    ? `${periodLabel}: ${shortDate(new Date(`${periodStart}T00:00:00Z`))} – ${shortDate(end)}`
    : periodLabel
  const disclosure = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const plant = plantTypeById(plantType)
  if (!plant) throw new RangeError(`Unknown plant type: ${plantType}`)
  const { Preview } = plant
  const state = healthStates[health]

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !disclosure.current?.contains(event.target)) {
        if (disclosure.current) disclosure.current.open = false
      }
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [])

  function runAction(action: () => void) {
    if (disclosure.current) disclosure.current.open = false
    trigger.current?.focus()
    action()
  }

  return (
    <article aria-labelledby={headingId} className="plant-card">
      <Card className="plant-card__surface">
        <div className="plant-card__toolbar">
          <span className="plant-card__health text-body-sm" data-health={health}>
            <Icon icon={state.icon} size="sm" />
            {state.label}
          </span>
          {/* Native disclosure supports Enter/Space and normal Tab navigation.
              Use a list of buttons rather than ARIA menu roles that require arrow-key behavior. */}
          <details ref={disclosure} className="plant-card__options" onKeyDown={(event) => {
            if (event.key === "Escape" && disclosure.current?.open) {
              event.preventDefault()
              disclosure.current.open = false
              trigger.current?.focus()
            }
          }}>
            <summary ref={trigger} className="button button--ghost button--md plant-card__trigger"
              aria-label={`Options for ${name}`}>
              <Icon icon={Ellipsis} size="sm" />
            </summary>
            <Card variant="elevated" className="plant-card__popover">
              <ul className="plant-card__actions">
                {onLogActivity && <li><Button variant="ghost" icon={Plus} full disabled={loggingDisabled} onClick={() => runAction(onLogActivity)}>Log activity</Button></li>}
                {detailsHref ? <li><Link className="button button--ghost button--md" href={detailsHref}>View details</Link></li>
                  : onViewDetails && <li><Button variant="ghost" icon={Eye} full onClick={() => runAction(onViewDetails)}>View details</Button></li>}
              </ul>
            </Card>
          </details>
        </div>
        <h3 id={headingId} className="text-h3 plant-card__name">{name}</h3>
        <div className="plant-card__art">
          {detailsHref ? (
            <Link href={detailsHref} className="plant-card__open" aria-label={name} {...hold.handlers}>
              <span className="plant-card__illustration" data-health={health} aria-hidden="true">
                <Preview seed={seed} stage={stage} />
              </span>
            </Link>
          ) : (
            <button type="button" className="plant-card__open" {...hold.handlers} onClick={onViewDetails}
              aria-label={`View details for ${name}`}>
              <span className="plant-card__illustration" data-health={health} aria-hidden="true">
                <Preview seed={seed} stage={stage} />
              </span>
            </button>
          )}
        </div>
        {onLogActivity && <div className="plant-card__hold" data-holding={hold.holding}>
          <span className="text-body-sm">Hold plant to log today</span>
          <span className="plant-card__hold-track" aria-hidden="true"><span /></span>
        </div>}
        <ProgressBar caption={caption} label={`${name}: ${periodLabel}`} count={count} target={target} />
      </Card>
    </article>
  )
}
