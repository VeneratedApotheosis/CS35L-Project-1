import { describe, expect, it } from "vitest"
import { SCENE_PLANTS } from "../plants"
import type { ScenePlant } from "../types"
import { formatPlant, formatPlants, groupOf, labelLanes, labelLines, labelText } from "./plantLine"

const base: ScenePlant = { id: "back-upper-1", type: "pothos", x: 735, y: 328, size: 130, stage: 4, wilt: 0, seed: 47 }

describe("formatPlant", () => {
  it("writes a plant as one line of plants.ts", () => {
    expect(formatPlant(base)).toBe('  { id: "back-upper-1", type: "pothos", x: 735, y: 328, size: 130, stage: 4, wilt: 0, seed: 47 },')
  })

  it("writes the pot, mirror and shelf only when there is something to write", () => {
    const line = formatPlant({ ...base, pot: { color: "navy", band: "stripe" }, mirror: true, shelf: "back-upper" })
    expect(line).toContain('pot: { color: "navy", band: "stripe" }')
    expect(line).toContain("mirror: true")
    expect(line).toContain('shelf: "back-upper"')
    expect(formatPlant({ ...base, pot: {}, mirror: false })).not.toMatch(/pot:|mirror/)
  })

  it("keeps the exact wilt, to two decimal places", () => {
    expect(formatPlant({ ...base, wilt: 0.35 })).toContain("wilt: 0.35")
    expect(labelLines({ ...base, wilt: 0.35 })[1]).toContain("w0.35")
  })

  it("keeps one decimal place for a nudged position", () => {
    expect(formatPlant({ ...base, x: 735.04, y: 328.25 })).toContain("x: 735, y: 328.3")
  })

  it("writes the whole scene so that pasting it back gives the same plants", () => {
    const rebuilt = new Function("return [" + formatPlants(SCENE_PLANTS) + "]")() as ScenePlant[]
    expect(rebuilt).toEqual(SCENE_PLANTS)
  })
})

describe("labels", () => {
  it("shows the id on one line and the details on the next", () => {
    expect(labelLines({ ...base, wilt: 0.5 })).toEqual(["back-upper-1", "pothos s4 w0.5 #47 130u"])
    expect(labelText(base)).toBe("back-upper-1 · pothos s4 w0 #47 130u")
  })

  it("groups plants by their shelf or row", () => {
    expect(groupOf(base)).toBe("back-upper")
    expect(groupOf({ ...base, id: "wall-left-12" })).toBe("wall-left")
  })

  it("puts neighbors in the same row in different lanes, so their labels do not collide", () => {
    const lanes = labelLanes(SCENE_PLANTS)
    expect(lanes.size).toBe(SCENE_PLANTS.length)
    const rows = new Map<string, ScenePlant[]>()
    for (const plant of SCENE_PLANTS) rows.set(groupOf(plant), [...(rows.get(groupOf(plant)) ?? []), plant])
    for (const row of rows.values()) {
      const byX = [...row].sort((a, b) => a.x - b.x)
      for (let i = 1; i < byX.length; i++) expect(lanes.get(byX[i].id)).not.toBe(lanes.get(byX[i - 1].id))
    }
    expect(Math.max(...lanes.values())).toBeLessThanOrEqual(2)
  })
})
