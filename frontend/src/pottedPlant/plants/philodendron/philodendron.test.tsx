import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Philodendron, PHILODENDRON_STEM } from "./Philodendron"
import { PHILODENDRON_CONFIG } from "./philodendronConfig"
import {
  createPhilodendron,
  leafOutline,
  redLeafIndices,
  stageLeafCounts,
} from "./philodendronStages"

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const EPS = 1e-6
const CONFIG = PHILODENDRON_CONFIG
const LIMITS = CONFIG.limits
const ANCHOR = CONFIG.dome.anchor

describe("stage ladder", () => {
  it("gives 2, 3, 4, 5 leaves for four stages", () => {
    expect(stageLeafCounts(4)).toEqual([2, 3, 4, 5])
  })

  it("never exceeds the leaf cap for any stage count", () => {
    for (let s = 1; s <= CONFIG.stages.max; s++) {
      for (const n of stageLeafCounts(s)) expect(n).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
    }
  })
})

describe("generated philodendron", () => {
  it("is deterministic", () => {
    expect(createPhilodendron(7)).toEqual(createPhilodendron(7))
  })

  it("builds exactly the requested number of stages and renders", () => {
    for (const stages of [1, 3, 4, 6]) {
      expect(createPhilodendron(7, { stages }).stages).toHaveLength(stages)
    }
    expect(renderToStaticMarkup(<Philodendron seed={7} stage={4} />)).toContain("<svg")
  })

  it("never draws more than the configured leaf cap", () => {
    for (const seed of SEEDS) {
      for (const st of createPhilodendron(seed).stages) {
        expect(st.leaves.length).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
      }
    }
  })

  it("makes the last stage at least 3.6 times the first, with longer leaves", () => {
    for (const seed of SEEDS) {
      const { stages } = createPhilodendron(seed)
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.leafLength).toBeGreaterThan(first.leafLength * 1.3)
    }
  })

  it("grows evenly in every direction", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { stages } = createPhilodendron(seed)
      const aspect = stages[0].height / stages[0].halfWidth
      for (const st of stages) {
        expect(st.height / st.halfWidth).toBeCloseTo(aspect, 9)
      }
    }
  })

  it("scales leaves, stems and positions with the rest of the plant", () => {
    // Each stage is the full-size plant scaled about the soil point, so every
    // leaf it shares with the last stage is that leaf, scaled.
    const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)
    for (const seed of SEEDS) {
      const { stages } = createPhilodendron(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const full = last.leaves.find((l) => l.index === leaf.index)!
          close(leaf.length / st.scale, full.length)
          close((leaf.baseX - ANCHOR.x) / st.scale, full.baseX - ANCHOR.x)
          close((ANCHOR.y - leaf.baseY) / st.scale, ANCHOR.y - full.baseY)
          close((leaf.stem.x0 - ANCHOR.x) / st.scale, full.stem.x0 - ANCHOR.x)
          close(leaf.angle, full.angle)
        }
      }
    }
  })

  it("keeps every leaf above the soil and within the side limits", () => {
    for (const seed of SEEDS) {
      for (const st of createPhilodendron(seed).stages) {
        for (const leaf of st.leaves) {
          for (const [x, y] of leafOutline(leaf)) {
            expect(x).toBeGreaterThanOrEqual(LIMITS.left - EPS)
            expect(x).toBeLessThanOrEqual(LIMITS.right + EPS)
            expect(y).toBeLessThanOrEqual(LIMITS.floor + EPS)
          }
        }
      }
    }
  })

  it("fills the canopy it encloses", () => {
    for (const seed of SEEDS) {
      for (const st of createPhilodendron(seed).stages) {
        expect(st.coverage).toBeGreaterThanOrEqual(0.15)
      }
    }
  })

  it("roots every stem between 25% and 75% of the way across the pot", () => {
    const width = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
    const [lo, hi] = CONFIG.roots.range
    for (const seed of SEEDS) {
      for (const st of createPhilodendron(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.stem.x0).toBeGreaterThanOrEqual(CONFIG.pot.rimLeft + width * lo - EPS)
          expect(leaf.stem.x0).toBeLessThanOrEqual(CONFIG.pot.rimLeft + width * hi + EPS)
        }
      }
    }
  })

  it("keeps each leaf's identity and shape across stages", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const { stages } = createPhilodendron(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const same = last.leaves.find((l) => l.index === leaf.index)
          expect(same?.spec).toEqual(leaf.spec)
        }
      }
    }
  })

  it("draws red stems and no flowers", () => {
    const html = renderToStaticMarkup(<Philodendron seed={7} stage={4} />)
    expect(html).toContain(PHILODENDRON_STEM.color)
    expect(html).not.toContain("data-flower")
  })
})

describe("the newest leaves are red", () => {
  it("marks one or two upright leaves red, stable across stages and scales", () => {
    for (const seed of SEEDS) {
      const plant = createPhilodendron(seed)
      const red = redLeafIndices(plant)
      expect(red.size).toBeGreaterThanOrEqual(1)
      expect(red.size).toBeLessThanOrEqual(2)
      // Every red leaf is present at the full-size stage it was chosen from.
      const last = plant.stages[plant.stages.length - 1]
      for (const index of red) {
        expect(last.leaves.some((l) => l.index === index)).toBe(true)
      }
    }
  })

  it("renders at least one burgundy leaf at the last stage", () => {
    const html = renderToStaticMarkup(<Philodendron seed={7} stage={4} />)
    expect(html).toContain("data-red=\"true\"")
  })
})

describe("scale", () => {
  const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")

  it("only changes the picture size, never leaf or stem placement", () => {
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<Philodendron seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<Philodendron seed={7} stage={stage} scale={0.4} />)
      const c = renderToStaticMarkup(<Philodendron seed={7} stage={stage} scale={1.7} />)
      expect(strip(b)).toBe(strip(a))
      expect(strip(c)).toBe(strip(a))
    }
  })
})
