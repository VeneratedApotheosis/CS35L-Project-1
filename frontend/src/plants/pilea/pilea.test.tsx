import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Pilea } from "./Pilea"
import { PILEA_CONFIG } from "./pileaConfig"
import { createPilea, leafOutline, stageLeafCounts } from "./pileaStages"

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const EPS = 1e-6
const CONFIG = PILEA_CONFIG
const LIMITS = CONFIG.limits
const ANCHOR = CONFIG.dome.anchor

describe("stage ladder", () => {
  it("gives 2, 3, 5, 6 leaves for four stages", () => {
    expect(stageLeafCounts(4)).toEqual([2, 3, 5, 6])
  })

  it("never exceeds the leaf cap for any stage count", () => {
    for (let s = 1; s <= CONFIG.stages.max; s++) {
      for (const n of stageLeafCounts(s)) expect(n).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
    }
  })
})

describe("generated pilea", () => {
  it("is deterministic", () => {
    expect(createPilea(7)).toEqual(createPilea(7))
  })

  it("builds exactly the requested number of stages and renders", () => {
    for (const stages of [1, 3, 4, 6]) {
      expect(createPilea(7, { stages }).stages).toHaveLength(stages)
    }
    expect(renderToStaticMarkup(<Pilea seed={7} stage={4} />)).toContain("<svg")
  })

  it("never draws more than the configured leaf cap", () => {
    for (const seed of SEEDS) {
      for (const st of createPilea(seed).stages) {
        expect(st.leaves.length).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
      }
    }
  })

  it("makes the last stage at least 3.6 times the first, with longer leaves", () => {
    for (const seed of SEEDS) {
      const { stages } = createPilea(seed)
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.leafLength).toBeGreaterThan(first.leafLength * 1.3)
    }
  })

  it("grows evenly in every direction", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { stages } = createPilea(seed)
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
      const { stages } = createPilea(seed)
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

  it("keeps every coin above the soil and within the side limits", () => {
    for (const seed of SEEDS) {
      for (const st of createPilea(seed).stages) {
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
      for (const st of createPilea(seed).stages) {
        expect(st.coverage).toBeGreaterThanOrEqual(0.15)
      }
    }
  })

  it("roots every stem between 25% and 75% of the way across the pot", () => {
    const width = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
    const [lo, hi] = CONFIG.roots.range
    for (const seed of SEEDS) {
      for (const st of createPilea(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.stem.x0).toBeGreaterThanOrEqual(CONFIG.pot.rimLeft + width * lo - EPS)
          expect(leaf.stem.x0).toBeLessThanOrEqual(CONFIG.pot.rimLeft + width * hi + EPS)
        }
      }
    }
  })

  it("keeps each coin's identity and shape across stages", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const { stages } = createPilea(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const same = last.leaves.find((l) => l.index === leaf.index)
          expect(same?.spec).toEqual(leaf.spec)
        }
      }
    }
  })

  it("shows baby pups from stage 2 on, and none in stage 1, with no flowers", () => {
    const stage1 = renderToStaticMarkup(<Pilea seed={7} stage={1} />)
    const stage4 = renderToStaticMarkup(<Pilea seed={7} stage={4} />)
    // A pup adds its own clip path; stage 1 has none beyond the main leaves.
    expect(stage4).toContain("-pup")
    expect(stage1).not.toContain("-pup")
    expect(stage4).not.toContain("data-flower")
  })
})

describe("scale", () => {
  const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")

  it("only changes the picture size, never leaf or stem placement", () => {
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<Pilea seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<Pilea seed={7} stage={stage} scale={0.4} />)
      const c = renderToStaticMarkup(<Pilea seed={7} stage={stage} scale={1.7} />)
      expect(strip(b)).toBe(strip(a))
      expect(strip(c)).toBe(strip(a))
    }
  })
})
