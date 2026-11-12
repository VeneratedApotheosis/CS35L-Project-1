"use client"

import type { HabitWithStats } from "@/lib/habits"
import { plantTypeById } from "@/plants/plantTypes"
import { habitSeed } from "@/plants/habitSeed"

const healthLabels = { healthy: "Healthy", slightly_wilted: "Slightly wilted", wilted: "Wilted" }

/** The detail view uses the same registry, seed, stage and health cue as its Garden card. */
export function HabitPlant({ habit }: { habit: HabitWithStats }) {
  const plant = plantTypeById(habit.plant_type)
  if (!plant) return null
  const { Preview } = plant
  return (
    <figure className="habit-plant stack-sm">
      <div className="plant-card__illustration habit-plant__illustration" data-health={habit.stats.health} aria-hidden="true">
        <Preview seed={habitSeed(habit.id)} stage={habit.stats.stage} />
      </div>
      <figcaption className="text-body-sm text-secondary">
        {plant.label} · Stage {habit.stats.stage} · {healthLabels[habit.stats.health]}
      </figcaption>
    </figure>
  )
}
