import { describe, expect, it } from "vitest"
import { VIEWBOX } from "@/pottedPlant/genome"
import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"
import { CANVAS, VANISH, convexHull, exitPoint, project } from "./geometry"
import { PLANT_VIEW, insidePolygon, plantBounds, plantFrame, shelfFaces, sunPatches } from "./placement"
import { ROOM, SAFE_ZONE, SHELVES, SUN } from "./room"
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

  it("lands every patch on the floor of the room, between its side walls", () => {
    for (const row of SUN.rows) {
      expect(row.from).toBeGreaterThanOrEqual(0)
      expect(row.to).toBeLessThanOrEqual(ROOM.right - ROOM.left)
    }
    for (const patch of sunPatches()) {
      for (const point of patch.outer) {
        // Below the left wall's base line and the right wall's, so on the floor and not behind the glass.
        const leftBase = ROOM.floorY + Math.max(0, ROOM.left - point.x) * 0.5909
        const rightBase = ROOM.floorY + Math.max(0, point.x - ROOM.right) * 0.5909
        expect(point.y).toBeGreaterThanOrEqual(Math.max(leftBase, rightBase) - 1)
      }
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
    expect(validateScene([plant({ shelf: "back-upper", x: 900, y: 328 })], SHELVES)).toEqual([])
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
      "f: size must be from 20 to 800",
      "g: x is outside the canvas",
      'h: unknown shelf "nowhere"',
      "i: its pot is not on the back-lower shelf",
      'j: unknown pot color "pink"',
    ]) {
      expect(messages).toContain(expected)
    }
  })

  it("has a varied real scene: every plant type, some wilt, many sizes and pot colors", () => {
    expect(SCENE_PLANTS.length).toBeGreaterThanOrEqual(30)
    expect(new Set(SCENE_PLANTS.map((p) => p.type)).size).toBe(PLANT_TYPES.length)
    expect(SCENE_PLANTS.filter((p) => p.wilt > 0).length).toBeGreaterThanOrEqual(2)
    expect(new Set(SCENE_PLANTS.map((p) => p.pot?.color)).size).toBeGreaterThanOrEqual(7)
  })

  it("has every plant fully grown", () => {
    expect(SCENE_PLANTS.every((p) => p.stage === 4)).toBe(true)
  })

  it("is crowded: many plants, and many pairs that overlap a little", () => {
    expect(SCENE_PLANTS.length).toBeGreaterThanOrEqual(50)
    let overlapping = 0
    for (let i = 0; i < SCENE_PLANTS.length; i++) {
      for (let j = i + 1; j < SCENE_PLANTS.length; j++) {
        const a = plantBounds(SCENE_PLANTS[i])
        const b = plantBounds(SCENE_PLANTS[j])
        const across = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
        const down = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
        if (across > 10 && down > 10) overlapping++
      }
    }
    expect(overlapping).toBeGreaterThanOrEqual(30)
  })

  it("fills the back-right corner with big plants", () => {
    const corner = SCENE_PLANTS.filter((p) => p.x > 1100 && p.y < 900 && p.size >= 290)
    expect(corner.length).toBeGreaterThanOrEqual(4)
    // And a high shelf on the right wall holds plants up near the roof.
    expect(SCENE_PLANTS.filter((p) => p.id.startsWith("right-upper")).length).toBeGreaterThanOrEqual(3)
  })

  it("keeps the shelf plants big: at least 50% bigger than the first version's 72", () => {
    const onShelves = SCENE_PLANTS.filter((p) => p.shelf)
    expect(onShelves.length).toBeGreaterThanOrEqual(10)
    expect(Math.min(...onShelves.map((p) => p.size))).toBeGreaterThanOrEqual(108)
  })

  it("keeps the biggest plant at about 460, which is 30% under the earlier 660", () => {
    const biggest = Math.max(...SCENE_PLANTS.map((p) => p.size))
    expect(biggest).toBeLessThanOrEqual(465)
    expect(biggest).toBeGreaterThanOrEqual(400)
  })

  it("fills the top-left corner with a high shelf of plants, above the text", () => {
    const topLeft = SCENE_PLANTS.filter((p) => p.id.startsWith("left-upper"))
    expect(topLeft.length).toBeGreaterThanOrEqual(4)
    expect(topLeft.filter((p) => p.size >= 150).length).toBeGreaterThanOrEqual(2)
    // They stand above the text area's top edge.
    expect(topLeft.every((p) => p.y <= SAFE_ZONE.y)).toBe(true)
  })

  it("keeps a single row of plants on the floor, with no second row in front", () => {
    const floor = SCENE_PLANTS.filter((p) => p.id.startsWith("wall-back"))
    expect(floor.length).toBeGreaterThanOrEqual(10)
    expect(Math.max(...floor.map((p) => p.y)) - Math.min(...floor.map((p) => p.y))).toBeLessThan(15)
    expect(SCENE_PLANTS.some((p) => p.id.startsWith("floor-front"))).toBe(false)
  })

  it("is mostly leafy plants, with the flowering ones as a pop of color", () => {
    const flowering = new Set(["rose", "lily", "lotus"])
    const counts = new Map<string, number>()
    for (const p of SCENE_PLANTS) counts.set(p.type, (counts.get(p.type) ?? 0) + 1)
    const flowers = SCENE_PLANTS.filter((p) => flowering.has(p.type)).length
    expect(flowers).toBeGreaterThanOrEqual(3)
    expect(flowers / SCENE_PLANTS.length).toBeLessThanOrEqual(0.2)
    // Pothos is the most common plant.
    expect(Math.max(...counts.values())).toBe(counts.get("pothos"))
  })

  it("lines the floor plants up along the walls, not scattered across the room", () => {
    // A floor plant stands near the back wall's foot, or near a side wall's foot.
    const floor = SCENE_PLANTS.filter(
      (p) => !p.shelf && !p.id.startsWith("big") && !p.id.startsWith("right-") && !p.id.startsWith("floor-front"),
    )
    expect(floor.length).toBeGreaterThanOrEqual(15)
    for (const p of floor) {
      const factor = Math.max(1, (p.y - VANISH.y) / (ROOM.floorY - VANISH.y))
      const nearBack = factor < 1.2
      const leftWall = project({ x: ROOM.left + 90, y: ROOM.floorY }, factor).x
      const rightWall = project({ x: ROOM.right - 90, y: ROOM.floorY }, factor).x
      const nearSide = Math.abs(p.x - leftWall) < 40 || Math.abs(p.x - rightWall) < 40
      expect(nearBack || nearSide).toBe(true)
    }
  })

  it("uses a different seed for every plant, so no two look the same", () => {
    expect(new Set(SCENE_PLANTS.map((p) => p.seed)).size).toBe(SCENE_PLANTS.length)
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
