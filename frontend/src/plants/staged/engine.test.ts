import { describe, expect, it } from "vitest"
import { leafPolygon, randomLeafSpec, type LeafSpec } from "../pothos/leaf"
import { POTHOS_CONFIG } from "../pothos/pothosConfig"
import { validateConfig } from "./config"
import { createStagedPlant, leafOutline } from "./generate"
import { leafCountLadder, scaleLadder } from "./ladder"
import type { LeafShapeModel, StagedPlantConfig, StagedPlantSpecies } from "./types"

/*
 * These tests use the engine with a plant that is NOT the pothos, to show the
 * engine holds no pothos-specific numbers: every limit comes from the config.
 */

const heart: LeafShapeModel<LeafSpec> = {
  randomSpec: randomLeafSpec,
  outline: (spec, length, perSegment) => leafPolygon(length, spec, perSegment),
  middle: 0.45,
}

/** A different plant: fewer, wider stages, a narrower dome, tighter roots. */
const OTHER_CONFIG: StagedPlantConfig = {
  ...POTHOS_CONFIG,
  name: "other",
  stages: { ...POTHOS_CONFIG.stages, default: 3, minLeaves: 1, maxLeaves: 4, growthRatio: 2 },
  dome: { ...POTHOS_CONFIG.dome, halfWidth: 40, height: 60 },
  roots: { ...POTHOS_CONFIG.roots, range: [0.35, 0.65] },
}
const OTHER: StagedPlantSpecies<LeafSpec> = { config: OTHER_CONFIG, leaf: heart }

const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1)

describe("engine with another plant's config", () => {
  it("validates", () => {
    expect(() => validateConfig(OTHER_CONFIG)).not.toThrow()
  })

  it("follows that config's stage count, leaf cap and growth ratio", () => {
    for (const seed of SEEDS) {
      const { stages } = createStagedPlant(seed, OTHER)
      expect(stages).toHaveLength(OTHER_CONFIG.stages.default)
      for (const st of stages) {
        expect(st.leaves.length).toBeLessThanOrEqual(OTHER_CONFIG.stages.maxLeaves)
      }
      const ratio = stages[stages.length - 1].halfWidth / stages[0].halfWidth
      expect(ratio).toBeCloseTo(OTHER_CONFIG.stages.growthRatio, 9)
    }
  })

  it("keeps every leaf inside that config's dome and above the soil", () => {
    const { dome, limits } = OTHER_CONFIG
    for (const seed of SEEDS) {
      for (const st of createStagedPlant(seed, OTHER).stages) {
        for (const leaf of st.leaves) {
          for (const [x, y] of leafOutline(leaf, OTHER)) {
            expect(x).toBeGreaterThanOrEqual(dome.anchor.x - st.halfWidth - 1e-6)
            expect(x).toBeLessThanOrEqual(dome.anchor.x + st.halfWidth + 1e-6)
            expect(y).toBeLessThanOrEqual(limits.floor + 1e-6)
          }
        }
      }
    }
  })

  it("roots stems inside that config's range", () => {
    const { pot, roots } = OTHER_CONFIG
    const width = pot.rimRight - pot.rimLeft
    const lo = pot.rimLeft + width * roots.range[0]
    const hi = pot.rimLeft + width * roots.range[1]
    for (const seed of SEEDS) {
      for (const st of createStagedPlant(seed, OTHER).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.stem.x0).toBeGreaterThanOrEqual(lo - 1e-6)
          expect(leaf.stem.x0).toBeLessThanOrEqual(hi + 1e-6)
        }
      }
    }
  })

  it("keeps plants with different configs apart in the cache", () => {
    const a = createStagedPlant(7, OTHER)
    const b = createStagedPlant(7, { config: POTHOS_CONFIG, leaf: heart })
    expect(a.stages.length).not.toBe(b.stages.length)
  })
})

describe("stage ladders", () => {
  it("rise from min to max leaves", () => {
    const counts = leafCountLadder(5, { ...POTHOS_CONFIG.stages, minLeaves: 1, maxLeaves: 9 })
    expect(counts[0]).toBe(1)
    expect(counts[counts.length - 1]).toBe(9)
    for (let k = 1; k < counts.length; k++) expect(counts[k]).toBeGreaterThan(counts[k - 1])
  })

  it("scale geometrically and end at 1", () => {
    const scales = scaleLadder(4, POTHOS_CONFIG.stages)
    expect(scales[scales.length - 1]).toBe(1)
    const steps = scales.slice(1).map((s, i) => s / scales[i])
    for (const step of steps) expect(step).toBeCloseTo(steps[0], 9)
  })
})

describe("validateConfig", () => {
  const broken = (patch: Partial<StagedPlantConfig>): StagedPlantConfig => ({
    ...POTHOS_CONFIG,
    name: "broken-" + Math.random(),
    ...patch,
  })

  it("accepts the pothos config", () => {
    expect(() => validateConfig(POTHOS_CONFIG)).not.toThrow()
  })

  it("rejects a dome wider than the limits", () => {
    const config = broken({ dome: { ...POTHOS_CONFIG.dome, halfWidth: 500 } })
    expect(() => validateConfig(config)).toThrow(/dome must fit/)
  })

  it("rejects more minimum leaves than maximum", () => {
    const config = broken({ stages: { ...POTHOS_CONFIG.stages, minLeaves: 9, maxLeaves: 3 } })
    expect(() => validateConfig(config)).toThrow(/minLeaves/)
  })

  it("rejects a root range outside the pot", () => {
    const config = broken({ roots: { ...POTHOS_CONFIG.roots, range: [0.2, 1.4] } })
    expect(() => validateConfig(config)).toThrow(/roots.range/)
  })

  it("lists every problem at once", () => {
    const config = broken({
      stages: { ...POTHOS_CONFIG.stages, growthRatio: 1 },
      coverage: { ...POTHOS_CONFIG.coverage, target: 2 },
    })
    expect(() => validateConfig(config)).toThrow(/growthRatio[\s\S]*coverage.target/)
  })
})
