import { describe, expect, it } from "vitest"
import { VIEWBOX } from "@/pottedPlant/genome"
import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"
import { CANVAS, VANISH, convexHull, exitPoint, project } from "./geometry"
import { PLANT_VIEW, insidePolygon, plantBounds, plantFrame, shelfFaces, sunPatches } from "./placement"
import { ROOM, SAFE_ZONE, SHELVES } from "./room"
import { SCENE_PLANTS } from "./plants"
import { SCENE_POT_COLORS, resolvePot } from "./scenePots"
import type { ScenePlant } from "./types"
import { validateScene } from "./validate"

const plant = (over: Partial<ScenePlant> = {}): ScenePlant => ({
  id: "test",
  type: "pothos",
  x: 900,
  y: 372,
  size: 90,
  stage: 3,
  wilt: 0,
  seed: 5,
  ...over,
})

describe("scene geometry", () => {
  it("keeps the vanishing point fixed and a factor of 1 in place", () => {
    expect(project(VANISH, 1.7)).toEqual(VANISH)
    expect(project({ x: 360, y: 210 }, 1)).toEqual({ x: 360, y: 210 })
  })

  it("moves points away from the vanishing point as they come nearer", () => {
    const near = project({ x: 360, y: 210 }, 1.5)
    expect(near.x).toBeLessThan(360)
    expect(near.y).toBeLessThan(210)
  })

  it("sends a ray from the vanishing point to the edge of the canvas", () => {
    for (const through of [{ x: 360, y: 210 }, { x: 1240, y: 660 }, { x: 800, y: 40 }, { x: 507, y: 660 }]) {
      const end = exitPoint(through)
      const onEdge = end.x <= 0.001 || end.x >= CANVAS.width - 0.001 || end.y <= 0.001 || end.y >= CANVAS.height - 0.001
      expect(onEdge).toBe(true)
      expect(end.x).toBeGreaterThanOrEqual(-0.001)
      expect(end.y).toBeLessThanOrEqual(CANVAS.height + 0.001)
    }
  })

  it("has a room whose parts agree", () => {
    expect(ROOM.left).toBeLessThan(VANISH.x)
    expect(ROOM.right).toBeGreaterThan(VANISH.x)
    expect(ROOM.peak.y).toBeLessThan(ROOM.eaveY)
    expect(ROOM.eaveY).toBeLessThan(VANISH.y)
    expect(ROOM.floorY).toBeGreaterThan(VANISH.y)
    expect([...ROOM.rings]).toEqual([...ROOM.rings].sort((a, b) => a - b))
    expect(ROOM.rings[0]).toBe(1)
    expect(ROOM.backBars.every((x) => x > ROOM.left && x < ROOM.right)).toBe(true)
  })
})

describe("sunlight", () => {
  it("wraps a set of points in the smallest convex outline", () => {
    const hull = convexHull([
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }, { x: 5, y: 1 },
    ])
    expect(hull).toHaveLength(4)
    expect(insidePolygon({ x: 5, y: 5 }, hull)).toBe(true)
  })

  it("makes every beam start from a pane of glass, not a point", () => {
    const patches = sunPatches()
    expect(patches.length).toBeGreaterThanOrEqual(6)
    for (const patch of patches) {
      const xs = patch.glass.map((p) => p.x)
      const ys = patch.glass.map((p) => p.y)
      // The glass has real width and height. Sunlight from a point would have none.
      expect(Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys))).toBeGreaterThan(40)
      expect(new Set(patch.glass.map((p) => p.x + "," + p.y)).size).toBe(4)
    }
  })

  it("spreads the patches across the width of the floor", () => {
    const centers = sunPatches().map((patch) => patch.outer.reduce((sum, p) => sum + p.x, 0) / patch.outer.length)
    expect(Math.max(...centers) - Math.min(...centers)).toBeGreaterThan(600)
  })
})

describe("plant placement", () => {
  it("uses the same canvas as the plants", () => {
    expect(VIEWBOX).toBe([PLANT_VIEW.x, PLANT_VIEW.y, PLANT_VIEW.width, PLANT_VIEW.height].join(" "))
  })

  it("puts the pot's bottom on the given point", () => {
    const frame = plantFrame({ x: 900, y: 500, size: 200 })
    expect(frame.x + frame.width / 2).toBeCloseTo(900)
    // The pot's bottom is 180 of the canvas's 205 units down, so 0.9 of the width.
    expect(frame.y + 0.9 * frame.width).toBeCloseTo(500)
    expect(frame.height).toBeCloseTo(205)
  })

  it("bounds a plant from its top to its pot's bottom", () => {
    const box = plantBounds({ x: 900, y: 500, size: 200 })
    expect(box.y + box.height).toBeCloseTo(500)
  })

  it("makes shelf boards that stick out from the wall", () => {
    for (const shelf of SHELVES) {
      const { top, front } = shelfFaces(shelf)
      expect(top).toHaveLength(4)
      expect(front).toHaveLength(4)
    }
  })

  it("tells inside from outside a polygon", () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    expect(insidePolygon({ x: 5, y: 5 }, square)).toBe(true)
    expect(insidePolygon({ x: 15, y: 5 }, square)).toBe(false)
  })
})

describe("scene pots", () => {
  it("draws a pot from the plant's seed unless told otherwise", () => {
    const a = resolvePot(plant({ seed: 11 }))
    const b = resolvePot(plant({ seed: 11 }))
    expect(a).toEqual(b)
    expect(a.colors).toBeUndefined()
  })

  it("lets a plant choose its pot's color, band and own seed", () => {
    const look = resolvePot(plant({ pot: { color: "navy", band: "none", seed: 3 } }))
    expect(look.colors).toBe(SCENE_POT_COLORS.navy)
    expect(look.band).toBe("none")
  })
})

describe("validateScene", () => {
  it("accepts the real scene", () => {
    expect(validateScene(SCENE_PLANTS, SHELVES)).toEqual([])
  })

  it("accepts a plant resting on its shelf", () => {
    expect(validateScene([plant({ shelf: "back-upper", x: 900, y: 372 })], SHELVES)).toEqual([])
  })

  it("lists each kind of mistake", () => {
    const messages = validateScene(
      [
        plant({ id: "a" }),
        plant({ id: "a" }),
        plant({ id: "b", type: "cactus" as ScenePlant["type"] }),
        plant({ id: "c", stage: 5 as ScenePlant["stage"] }),
        plant({ id: "d", wilt: 1.5 }),
        plant({ id: "e", seed: -1 }),
        plant({ id: "f", size: 5 }),
        plant({ id: "g", x: 2000 }),
        plant({ id: "h", shelf: "nowhere" }),
        plant({ id: "i", shelf: "back-lower", y: 400 }),
        plant({ id: "j", pot: { color: "pink" as never } }),
      ],
      SHELVES,
    ).join("\n")
    for (const expected of [
      "a: the id is used more than once",
      'b: unknown plant type "cactus"',
      "c: stage must be 1, 2, 3 or 4",
      "d: wilt must be from 0 to 1",
      "e: seed must be a whole number",
      "f: size must be from 20 to 600",
      "g: x is outside the canvas",
      'h: unknown shelf "nowhere"',
      "i: its pot is not on the back-lower shelf",
      'j: unknown pot color "pink"',
    ]) {
      expect(messages).toContain(expected)
    }
  })

  it("keeps plants out of the text area", () => {
    const inside = plant({ id: "in", x: SAFE_ZONE.x + 100, y: SAFE_ZONE.y + 300, size: 120 })
    expect(validateScene([inside], SHELVES).join("\n")).toContain("in: reaches into the text area")
    const outside = plant({ id: "out", x: 1100, y: 700, size: 120 })
    expect(validateScene([outside], SHELVES)).toEqual([])
  })

  it("knows every plant type the app offers", () => {
    for (const type of PLANT_TYPES) {
      expect(validateScene([plant({ id: type.id, type: type.id, x: 1100, y: 700 })], SHELVES)).toEqual([])
    }
  })
})
