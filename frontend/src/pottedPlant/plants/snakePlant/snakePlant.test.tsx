import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SnakePlant } from "./SnakePlant"
import { SNAKE_PLANT_CONFIG } from "./snakePlantConfig"
import { createSnakePlant, leafOutline } from "./snakePlantStages"

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)
const EPS = 1e-6
const LIMITS = SNAKE_PLANT_CONFIG.limits
const CONFIG = SNAKE_PLANT_CONFIG

describe("snake plant", () => {
  it("is deterministic", () => {
    expect(createSnakePlant(7)).toEqual(createSnakePlant(7))
  })

  it("builds the requested number of stages and renders", () => {
    const plant = createSnakePlant(7)
    expect(plant.stages).toHaveLength(CONFIG.stages.default)
    expect(renderToStaticMarkup(<SnakePlant seed={7} stage={4} />)).toContain("<svg")
  })

  it("never draws more than the configured leaf cap", () => {
    for (const seed of SEEDS) {
      for (const stage of createSnakePlant(seed).stages) {
        expect(stage.leaves.length).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
      }
    }
  })

  it("grows: the last stage is at least 3.6 times the first", () => {
    for (const seed of SEEDS) {
      const stages = createSnakePlant(seed).stages
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
    }
  })

  it("keeps every leaf above the soil and within the side limits", () => {
    for (const seed of SEEDS) {
      for (const stage of createSnakePlant(seed).stages) {
        for (const leaf of stage.leaves) {
          for (const [x, y] of leafOutline(leaf)) {
            expect(x).toBeGreaterThanOrEqual(LIMITS.left - EPS)
            expect(x).toBeLessThanOrEqual(LIMITS.right + EPS)
            expect(y).toBeLessThanOrEqual(LIMITS.floor + EPS)
          }
        }
      }
    }
  })

  it("roots every leaf in the middle half of the pot", () => {
    const width = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
    const [lo, hi] = CONFIG.roots.range
    for (const seed of SEEDS) {
      const last = createSnakePlant(seed).stages.at(-1)!
      for (const leaf of last.leaves) {
        expect(leaf.stem.x0).toBeGreaterThanOrEqual(CONFIG.pot.rimLeft + width * lo - 1)
        expect(leaf.stem.x0).toBeLessThanOrEqual(CONFIG.pot.rimLeft + width * hi + 1)
      }
    }
  })

  it("has no flowers", () => {
    expect(renderToStaticMarkup(<SnakePlant seed={7} stage={4} />)).not.toContain("data-flower")
  })
})
