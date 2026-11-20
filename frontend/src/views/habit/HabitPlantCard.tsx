"use client"

import type { HabitDetail } from "@/lib/habits"
import { habitSeed } from "@/pottedPlant/habitSeed"
import { plantTypeById } from "@/pottedPlant/plants/plantTypes"
import { wiltForHealth } from "@/pottedPlant/plants/staged/wilt"

const healthLabels = { healthy: "Healthy", slightly_wilted: "Slightly wilted", wilted: "Wilted" } as const

/** The plant on its own, at its real stage and health, with a pill under it: its kind, its level and its health. */
export function HabitPlantCard({ habit }: { habit: HabitDetail }) {
  const plant = plantTypeById(habit.plant_type)
  const { stage, health } = habit.stats
  return (
    <figure className="habit-card habit-plant-card" data-health={health}>
      <div className="habit-plant-card__art" aria-hidden="true">
        {plant && <plant.Preview seed={habitSeed(habit.id)} stage={stage} wilt={wiltForHealth(health)} />}
      </div>
      <figcaption className="habit-plant-card__pill">
        <span>{plant?.label ?? habit.plant_type} · Lv. {stage}</span>
        <span className="habit-plant-card__health">{healthLabels[health]}</span>
      </figcaption>
    </figure>
  )
}
