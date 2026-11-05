"use client"

import { useEffect, useId, useRef } from "react"
import { CircleAlert, Droplet, Ellipsis, Eye, Leaf, Pencil, Plus } from "lucide-react"
import { plantTypeById, type PlantTypeId } from "@/plants/plantTypes"
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
  onLogActivity: () => void
  onViewDetails: () => void
  onEditHabit: () => void
}

/** A presentation-only garden item. The parent supplies data and owns all actions. */
export function PlantCard({
  name, plantType, seed, stage, health, count, target, periodLabel,
  onLogActivity, onViewDetails, onEditHabit,
}: PlantCardProps) {
  const headingId = useId()
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
              <Icon icon={Ellipsis} />
            </summary>
            <Card variant="elevated" className="plant-card__popover">
              <ul className="plant-card__actions">
                <li><Button variant="ghost" icon={Plus} full onClick={() => runAction(onLogActivity)}>Log activity</Button></li>
                <li><Button variant="ghost" icon={Eye} full onClick={() => runAction(onViewDetails)}>View details</Button></li>
                <li><Button variant="ghost" icon={Pencil} full onClick={() => runAction(onEditHabit)}>Edit habit</Button></li>
              </ul>
            </Card>
          </details>
        </div>
        <h3 id={headingId}>
          <button type="button" className="plant-card__open" onClick={onViewDetails}
            aria-label={`View details for ${name}`}>
            <span className="plant-card__illustration" data-health={health} aria-hidden="true">
              <Preview seed={seed} stage={stage} />
            </span>
            <span className="text-h3 plant-card__name">{name}</span>
          </button>
        </h3>
        <ProgressBar label={`${name}: ${periodLabel}`} count={count} target={target} />
      </Card>
    </article>
  )
}
