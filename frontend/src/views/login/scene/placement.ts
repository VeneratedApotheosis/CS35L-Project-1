import { POT_SHAPE } from "@/pottedPlant/pots"
import { project, type Point } from "./geometry"
import { ROOM, SUN } from "./room"
import type { ScenePlant, Shelf } from "./types"

/** The plant canvas every species draws in (see pottedPlant/genome.ts VIEWBOX): "0 30 200 205". */
export const PLANT_VIEW = { x: 0, y: 30, width: 200, height: 205 } as const

/** The height, in the plant canvas, where the pot's bottom sits. */
const POT_BOTTOM = POT_SHAPE.shadow.cy

export interface Frame {
  x: number
  y: number
  width: number
  height: number
}

/** Where a plant's picture goes on the scene canvas, so that the pot's bottom lands on (x, y). */
export function plantFrame(plant: Pick<ScenePlant, "x" | "y" | "size">): Frame {
  const unit = plant.size / PLANT_VIEW.width
  return {
    x: plant.x - plant.size / 2,
    y: plant.y - (POT_BOTTOM - PLANT_VIEW.y) * unit,
    width: plant.size,
    height: PLANT_VIEW.height * unit,
  }
}

/** A box that surely holds the plant's leaves and pot: the picture, without the empty strip under the pot. */
export function plantBounds(plant: Pick<ScenePlant, "x" | "y" | "size">): Frame {
  const frame = plantFrame(plant)
  return { ...frame, height: plant.y - frame.y }
}

/** The top and front faces of a shelf board, as polygons on the canvas. */
export function shelfFaces(shelf: Shelf): { top: Point[]; front: Point[] } {
  if (shelf.side === "back") {
    const reach = shelf.reach ?? 1.05
    const wallLeft = { x: shelf.from, y: shelf.y }
    const wallRight = { x: shelf.to, y: shelf.y }
    const freeLeft = project(wallLeft, reach)
    const freeRight = project(wallRight, reach)
    const drop = shelf.thickness * reach
    return {
      top: [wallLeft, wallRight, freeRight, freeLeft],
      front: [freeLeft, freeRight, { x: freeRight.x, y: freeRight.y + drop }, { x: freeLeft.x, y: freeLeft.y + drop }],
    }
  }
  const inset = shelf.inset ?? 70
  const wall = (factor: number) => project({ x: 1240, y: shelf.y }, factor)
  const free = (factor: number) => project({ x: 1240 - inset, y: shelf.y }, factor)
  return {
    top: [wall(shelf.from), wall(shelf.to), free(shelf.to), free(shelf.from)],
    front: [
      free(shelf.from),
      free(shelf.to),
      { x: free(shelf.to).x, y: free(shelf.to).y + shelf.thickness * shelf.to },
      { x: free(shelf.from).x, y: free(shelf.from).y + shelf.thickness * shelf.from },
    ],
  }
}

/**
 * Where a patch of sun lands on the floor: some units in from the right wall,
 * at some depth. The light leans, so farther from the wall means farther back.
 */
export function sunLanding(inset: number, factor: number): Point {
  const leaned = Math.max(1, factor - SUN.slant * inset)
  return project({ x: ROOM.right - inset, y: ROOM.floorY }, leaned)
}

/** Whether a point is inside a polygon. */
export function insidePolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}
