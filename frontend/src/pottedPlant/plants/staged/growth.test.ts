import { describe, expect, it } from "vitest"
import { createPothos } from "../pothos/pothosStages"
import { blendStage, GROWTH, springProgress } from "./growth"

const plant = createPothos(7, { stages: 4 })
const [, second, third] = plant.stages

describe("the spring", () => {
  it("starts at 0, overshoots 1, and settles at 1", () => {
    expect(springProgress(0)).toBe(0)
    expect(springProgress(GROWTH.duration)).toBe(1)
    expect(springProgress(GROWTH.duration + 5)).toBe(1)
    const samples = Array.from({ length: 100 }, (_, i) => springProgress((i / 100) * GROWTH.duration))
    expect(Math.max(...samples)).toBeGreaterThan(1)
    expect(Math.max(...samples)).toBeLessThan(1.3)
    expect(Math.abs(samples[99] - 1)).toBeLessThan(0.05)
  })
})

describe("blending two stages", () => {
  it("is the old stage's leaves at 0 and the new stage's at 1", () => {
    const start = blendStage(second, third, 0)
    const end = blendStage(second, third, 1)
    for (const leaf of end.leaves) {
      const target = third.leaves.find((other) => other.index === leaf.index)!
      expect(leaf.length).toBeCloseTo(target.length, 9)
      expect(leaf.baseX).toBeCloseTo(target.baseX, 9)
      expect(leaf.angle).toBeCloseTo(target.angle, 9)
    }
    for (const leaf of start.leaves) {
      const old = second.leaves.find((other) => other.index === leaf.index)
      if (!old) continue
      expect(leaf.length).toBeCloseTo(old.length, 9)
      expect(leaf.baseY).toBeCloseTo(old.baseY, 9)
      expect(leaf.angle).toBeCloseTo(old.angle, 9)
    }
  })

  it("grows a new leaf out of the soil, at the foot of its stem", () => {
    const oldIndexes = new Set(second.leaves.map((leaf) => leaf.index))
    const added = third.leaves.filter((leaf) => !oldIndexes.has(leaf.index))
    expect(added.length).toBeGreaterThan(0)
    const start = blendStage(second, third, 0)
    for (const leaf of added) {
      const bud = start.leaves.find((other) => other.index === leaf.index)!
      expect(bud.length).toBeLessThan(1)
      expect(bud.baseX).toBeCloseTo(leaf.stem.x0, 9)
      expect(bud.baseY).toBeCloseTo(leaf.stem.y0, 9)
    }
  })

  it("keeps every leaf's root, never shrinks a leaf to nothing, and moves nothing but leaves and stems", () => {
    for (const t of [0, 0.3, 0.7, 1, 1.12]) {
      const stage = blendStage(second, third, t)
      expect(stage.stage).toBe(third.stage)
      expect(stage.leaves).toHaveLength(third.leaves.length)
      for (const leaf of stage.leaves) {
        const target = third.leaves.find((other) => other.index === leaf.index)!
        expect(leaf.stem.x0).toBe(target.stem.x0)
        expect(leaf.stem.y0).toBe(target.stem.y0)
        expect(leaf.length).toBeGreaterThanOrEqual(GROWTH.minLength)
      }
    }
  })

  it("does not draw leaves the new stage drops", () => {
    const stage = blendStage(third, second, 0.5)
    expect(stage.leaves).toHaveLength(second.leaves.length)
  })
})
