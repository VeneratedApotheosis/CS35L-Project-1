import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Pot, potLookFromSeed } from "../../pots"
import { PLANT_TYPES } from "../plantTypes"
import { KIMBERLY_QUEEN_SPECIES } from "../kimberlyQueen/kimberlyQueenStages"
import { LILY_SPECIES } from "../lily/lilyStages"
import { MONSTERA_SPECIES } from "../monstera/monsteraStages"
import { PEACE_LILY_SPECIES } from "../peaceLily/peaceLilyStages"
import { PHILODENDRON_SPECIES } from "../philodendron/philodendronStages"
import { PILEA_SPECIES } from "../pilea/pileaStages"
import { POTHOS_SPECIES } from "../pothos/pothosStages"
import { ROSE_SPECIES } from "../rose/roseStages"
import { SNAKE_PLANT_SPECIES } from "../snakePlant/snakePlantStages"
import { createStagedPlant, leafOutline } from "./generate"
import type { StagedPlantSpecies } from "./types"
import { bendPoint, browningOf, WILT, wiltForHealth, wiltPlant } from "./wilt"

type Species = StagedPlantSpecies<never>
const SPECIES = [
  POTHOS_SPECIES, PEACE_LILY_SPECIES, PILEA_SPECIES, SNAKE_PLANT_SPECIES, KIMBERLY_QUEEN_SPECIES,
  LILY_SPECIES, ROSE_SPECIES, MONSTERA_SPECIES, PHILODENDRON_SPECIES,
] as unknown as Species[]
const SEEDS = Array.from({ length: 6 }, (_, i) => i + 1)

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length
const lastStage = (species: Species, seed: number, wilt: number) => {
  const plant = wiltPlant(createStagedPlant(seed, species), wilt)
  return plant.stages[plant.stages.length - 1]
}

describe("wilting a staged plant", () => {
  it("leaves a healthy plant exactly as it was", () => {
    for (const species of SPECIES) {
      const plant = createStagedPlant(7, species)
      expect(wiltPlant(plant, 0)).toBe(plant)
    }
  })

  it("droops the leaves more as the plant wilts", () => {
    for (const species of SPECIES) {
      const angles = [0, 0.5, 1].map((wilt) =>
        mean(SEEDS.flatMap((seed) => lastStage(species, seed, wilt).leaves.map((leaf) => Math.abs(leaf.angle)))),
      )
      expect(angles[1], species.config.name).toBeGreaterThan(angles[0])
      expect(angles[2], species.config.name).toBeGreaterThan(angles[1])
    }
  }, 60_000)

  it("bends the stems more as the plant wilts, tilting each tip outward", () => {
    for (const species of SPECIES) {
      const tilt = (wilt: number) =>
        mean(SEEDS.flatMap((seed) => lastStage(species, seed, wilt).leaves.map((leaf) => {
          const { x0, y0, x1, y1 } = leaf.stem
          return Math.abs((Math.atan2(x1 - x0, y0 - y1) * 180) / Math.PI)
        })))
      expect(tilt(0.5), species.config.name).toBeGreaterThan(tilt(0))
      expect(tilt(1), species.config.name).toBeGreaterThan(tilt(0.5))
    }
  })

  it("curves long leaves along their length more as the plant wilts, and short ones less", () => {
    const bend = (wilt: number) => {
      const leaves = SEEDS.flatMap((seed) => lastStage(SNAKE_PLANT_SPECIES as unknown as Species, seed, wilt).leaves)
      return mean(leaves.map((leaf) => Math.abs(leaf.bend ?? 0)))
    }
    expect(bend(0.5)).toBeGreaterThan(0)
    expect(bend(1)).toBeGreaterThan(bend(0.5))
    const longest = SEEDS.flatMap((seed) => lastStage(KIMBERLY_QUEEN_SPECIES as unknown as Species, seed, 1).leaves)
    const shortest = SEEDS.flatMap((seed) => lastStage(PILEA_SPECIES as unknown as Species, seed, 1).leaves)
    expect(mean(longest.map((leaf) => Math.abs(leaf.bend ?? 0)))).toBeGreaterThan(mean(shortest.map((leaf) => Math.abs(leaf.bend ?? 0))))
    for (const leaf of [...longest, ...shortest]) expect(Math.abs(leaf.bend ?? 0)).toBeLessThanOrEqual(WILT.leafCurve + 1e-9)
  })

  it("curves a straight leaf along an arc that keeps its length and leaves its stalk alone", () => {
    expect(bendPoint([0, 0], 50, 60)).toEqual([0, 0])
    expect(bendPoint([3, -20], 50, 0)).toEqual([3, -20])
    const [tipX, tipY] = bendPoint([0, -50], 50, 60)
    expect(Math.hypot(tipX, tipY)).toBeLessThan(50)
    expect(tipX).toBeGreaterThan(0)
    const arc = (50 / ((60 * Math.PI) / 180)) * 2 * Math.sin(((60 * Math.PI) / 180) / 2)
    expect(Math.hypot(tipX, tipY)).toBeCloseTo(arc, 5)
  })

  it("makes the average fully wilted leaf almost horizontal", () => {
    const pothosLike = [POTHOS_SPECIES, PEACE_LILY_SPECIES, PILEA_SPECIES, LILY_SPECIES, ROSE_SPECIES, MONSTERA_SPECIES, PHILODENDRON_SPECIES]
    for (const species of pothosLike as unknown as Species[]) {
      const average = mean(SEEDS.flatMap((seed) => lastStage(species, seed, 1).leaves.map((leaf) => Math.abs(leaf.angle))))
      expect(average, species.config.name).toBeGreaterThanOrEqual(65)
      expect(average, species.config.name).toBeLessThanOrEqual(90)
    }
  })

  it("keeps every leaf inside the side limits and above the soil at all three health states", () => {
    for (const species of SPECIES) {
      const { limits } = species.config
      for (const wilt of [0.5, 1]) {
        for (const seed of SEEDS) {
          const plant = wiltPlant(createStagedPlant(seed, species), wilt)
          for (const stage of plant.stages) {
            for (const leaf of stage.leaves) {
              for (const [x, y] of leafOutline(leaf, species)) {
                expect(x, species.config.name).toBeGreaterThanOrEqual(limits.left - 0.01)
                expect(x, species.config.name).toBeLessThanOrEqual(limits.right + 0.01)
                expect(y, species.config.name).toBeLessThanOrEqual(limits.floor + 0.01)
              }
            }
          }
        }
      }
    }
  }, 60_000)

  it("browns about half of the leaves, and a quarter of all of them a darker brown", () => {
    const leaves = SEEDS.flatMap((seed) => lastStage(POTHOS_SPECIES as unknown as Species, seed, 1).leaves)
    const share = (tone: string) => leaves.filter((leaf) => leaf.browning?.tone === tone).length / leaves.length
    expect(share("dark")).toBeGreaterThan(0.18)
    expect(share("dark")).toBeLessThan(0.32)
    expect(share("brown") + share("dark")).toBeGreaterThan(0.42)
    expect(share("brown") + share("dark")).toBeLessThan(0.58)
  })

  it("browns the same leaves every time, and shows more brown as the wilt grows", () => {
    expect(browningOf(5, 3)).toBe(browningOf(5, 3))
    const half = lastStage(POTHOS_SPECIES as unknown as Species, 5, 0.5).leaves.map((leaf) => leaf.browning)
    const full = lastStage(POTHOS_SPECIES as unknown as Species, 5, 1).leaves.map((leaf) => leaf.browning)
    half.forEach((browning, i) => {
      expect(browning?.tone).toBe(full[i]?.tone)
      if (browning) expect(browning.amount).toBeLessThan(full[i]!.amount)
    })
  })

  it("maps the three health states to no, some and full wilt", () => {
    expect([wiltForHealth("healthy"), wiltForHealth("slightly_wilted"), wiltForHealth("wilted")]).toEqual([0, 0.5, 1])
  })
})

describe("a wilted plant picture", () => {
  it("leaves the pot exactly as it was, and browns leaves through a filter", () => {
    const potMarkup = renderToStaticMarkup(<svg><Pot look={potLookFromSeed(42)} id="x" /></svg>)
    expect(potMarkup).toContain("fill=")
    for (const type of PLANT_TYPES.filter((plant) => plant.id !== "lotus")) {
      const { Preview } = type
      const healthy = renderToStaticMarkup(<Preview seed={42} stage={4} />)
      const wilted = renderToStaticMarkup(<Preview seed={42} stage={4} wilt={1} />)
      // The pot is drawn first, so a pot that was changed would end the shared start of the two pictures early.
      let shared = 0
      while (shared < healthy.length && healthy[shared] === wilted[shared]) shared++
      expect(shared, type.id).toBeGreaterThan(potMarkup.length * 0.9)
      expect(wilted, type.id).toMatch(/filter="url\(#[^)]*-(brown|dark)\)"/)
      expect(healthy, type.id).not.toContain("-brown)")
    }
  })
})
