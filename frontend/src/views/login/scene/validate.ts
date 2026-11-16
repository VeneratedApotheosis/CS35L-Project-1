import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"
import { CANVAS } from "./geometry"
import { insidePolygon, plantBounds, shelfFaces } from "./placement"
import { SAFE_ZONE } from "./room"
import { SCENE_POT_COLOR_NAMES } from "./scenePots"
import type { ScenePlant, Shelf } from "./types"

/** How far a pot's bottom may be from a shelf's top and still count as resting on it. */
const REST_TOLERANCE = 3

/** Whether a plant's pot bottom is on the top of a shelf board, give or take a few units. */
function restsOn(plant: ScenePlant, shelf: Shelf): boolean {
  const { top } = shelfFaces(shelf)
  if (shelf.side === "back") {
    // A back board is seen almost edge-on, so check its width and the height range it covers.
    const ys = top.map((point) => point.y)
    return (
      plant.x >= shelf.from &&
      plant.x <= shelf.to &&
      plant.y >= Math.min(...ys) - REST_TOLERANCE &&
      plant.y <= Math.max(...ys) + REST_TOLERANCE
    )
  }
  return insidePolygon({ x: plant.x, y: plant.y }, top)
}

/**
 * Everything wrong with a list of scene plants, as readable lines. An empty list
 * means the scene is fine. The tests run this on the real list, and the dev
 * overlay shows the lines, so a bad edit is noticed at once.
 */
export function validateScene(plants: readonly ScenePlant[], shelves: readonly Shelf[]): string[] {
  const problems: string[] = []
  const known = new Set<string>(PLANT_TYPES.map((type) => type.id))
  const colors = new Set<string>(SCENE_POT_COLOR_NAMES)
  const ids = new Set<string>()

  for (const plant of plants) {
    const at = plant.id + ": "

    if (ids.has(plant.id)) problems.push(at + "the id is used more than once")
    ids.add(plant.id)

    if (!known.has(plant.type)) problems.push(at + 'unknown plant type "' + plant.type + '"')
    if (![1, 2, 3, 4].includes(plant.stage)) problems.push(at + "stage must be 1, 2, 3 or 4")
    if (!(plant.wilt >= 0 && plant.wilt <= 1)) problems.push(at + "wilt must be from 0 to 1")
    if (!Number.isInteger(plant.seed) || plant.seed < 0) problems.push(at + "seed must be a whole number, 0 or more")
    if (!(plant.size >= 20 && plant.size <= 800)) problems.push(at + "size must be from 20 to 800")
    if (plant.pot?.color && !colors.has(plant.pot.color)) problems.push(at + 'unknown pot color "' + plant.pot.color + '"')

    if (plant.x < 0 || plant.x > CANVAS.width) problems.push(at + "x is outside the canvas (0 to " + CANVAS.width + ")")
    if (plant.y < 0 || plant.y > CANVAS.height + plant.size) problems.push(at + "y is outside the canvas")

    if (plant.shelf) {
      const shelf = shelves.find((candidate) => candidate.id === plant.shelf)
      if (!shelf) {
        problems.push(at + 'unknown shelf "' + plant.shelf + '"')
      } else {
        if (!restsOn(plant, shelf)) problems.push(at + "its pot is not on the " + shelf.id + " shelf (check x and y)")
      }
    }

    const box = plantBounds(plant)
    const overlapsX = box.x < SAFE_ZONE.x + SAFE_ZONE.width && box.x + box.width > SAFE_ZONE.x
    const overlapsY = box.y < SAFE_ZONE.y + SAFE_ZONE.height && box.y + box.height > SAFE_ZONE.y
    if (overlapsX && overlapsY) problems.push(at + "reaches into the text area on the left")
  }
  return problems
}
