import { round1 } from "../geometry"
import type { ScenePlant, ScenePot } from "../types"

/** A number as short text: whole numbers have no decimal point, others keep one decimal place. */
const num = (n: number) => String(round1(n))

/** Wilt keeps two decimal places, because it moves in steps of 0.05. */
const wilt = (n: number) => String(Math.round(n * 100) / 100)

/** The pot's fields, written as they appear in plants.ts. Empty when the pot comes entirely from the seed. */
function potText(pot: ScenePot | undefined): string {
  if (!pot) return ""
  const parts: string[] = []
  if (pot.color) parts.push('color: "' + pot.color + '"')
  if (pot.band) parts.push('band: "' + pot.band + '"')
  if (pot.finish) parts.push('finish: "' + pot.finish + '"')
  if (pot.seed !== undefined) parts.push("seed: " + pot.seed)
  return parts.length > 0 ? "pot: { " + parts.join(", ") + " }" : ""
}

/** One plant as a line of plants.ts, ready to paste into the list. */
export function formatPlant(plant: ScenePlant): string {
  const parts = [
    'id: "' + plant.id + '"',
    'type: "' + plant.type + '"',
    "x: " + num(plant.x),
    "y: " + num(plant.y),
    "size: " + num(plant.size),
    "stage: " + plant.stage,
    "wilt: " + wilt(plant.wilt),
    "seed: " + plant.seed,
  ]
  const pot = potText(plant.pot)
  if (pot) parts.push(pot)
  if (plant.mirror) parts.push("mirror: true")
  if (plant.shelf) parts.push('shelf: "' + plant.shelf + '"')
  return "  { " + parts.join(", ") + " },"
}

/** Every plant, one per line, in the order given. */
export function formatPlants(plants: readonly ScenePlant[]): string {
  return plants.map(formatPlant).join("\n")
}

/** The two lines of a plant's dev label: its id, then its details. */
export function labelLines(plant: ScenePlant): [string, string] {
  return [plant.id, [plant.type, "s" + plant.stage, "w" + wilt(plant.wilt), "#" + plant.seed, num(plant.size) + "u"].join(" ")]
}

/** The label as one line, for places that show text only. */
export function labelText(plant: ScenePlant): string {
  return labelLines(plant).join(" · ")
}

/** The shelf or row a plant belongs to: its id without the trailing number. */
export function groupOf(plant: ScenePlant): string {
  return plant.id.replace(/-\d+$/, "")
}

/**
 * Which of three lanes a plant's label goes in. Neighbors in the same shelf or
 * row take turns, so their labels sit at different heights instead of on top of
 * each other.
 */
export function labelLanes(plants: readonly ScenePlant[]): Map<string, number> {
  const lanes = new Map<string, number>()
  const groups = new Map<string, ScenePlant[]>()
  for (const plant of plants) {
    const list = groups.get(groupOf(plant)) ?? []
    list.push(plant)
    groups.set(groupOf(plant), list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.x - b.x).forEach((plant, index) => lanes.set(plant.id, index % 3))
  }
  return lanes
}
