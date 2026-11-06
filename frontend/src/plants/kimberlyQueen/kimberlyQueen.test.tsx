import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { KimberlyFrondShape } from "./KimberlyFrondShape"
import { KimberlyQueen } from "./KimberlyQueen"
import { KIMBERLY_QUEEN_CONFIG } from "./kimberlyQueenConfig"
import { kimberlyFrondOutline, randomKimberlyFrond } from "./kimberlyLeaf"
import { createKimberlyQueen, leafOutline, stageLeafCounts } from "./kimberlyQueenStages"
import { mulberry32 } from "../rng"

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const EPS = 1e-6
const CONFIG = KIMBERLY_QUEEN_CONFIG
const LIMITS = CONFIG.limits
const ANCHOR = CONFIG.dome.anchor

describe("stage ladder", () => {
  it("gives 3, 6, 9, 12 fronds for four stages", () => {
    expect(stageLeafCounts(4)).toEqual([3, 6, 9, 12])
  })

  it("caps the full crown at twelve fronds", () => {
    expect(CONFIG.stages.maxLeaves).toBe(12)
  })

  it("never exceeds the frond cap for any stage count", () => {
    for (let s = 1; s <= CONFIG.stages.max; s++) {
      for (const n of stageLeafCounts(s)) expect(n).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
    }
  })
})

describe("generated Kimberly Queen fern", () => {
  it("is deterministic", () => {
    expect(createKimberlyQueen(7)).toEqual(createKimberlyQueen(7))
  })

  it("builds exactly the requested number of stages and renders", () => {
    for (const stages of [1, 3, 4, 6]) {
      expect(createKimberlyQueen(7, { stages }).stages).toHaveLength(stages)
    }
    expect(renderToStaticMarkup(<KimberlyQueen seed={7} stage={4} />)).toContain("<svg")
  })

  it("never draws more than the configured frond cap", () => {
    for (const seed of SEEDS) {
      for (const st of createKimberlyQueen(seed).stages) {
        expect(st.leaves.length).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
      }
    }
  })

  it("makes the last stage at least 3.6 times the first, with longer fronds", () => {
    for (const seed of SEEDS) {
      const { stages } = createKimberlyQueen(seed)
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.leafLength).toBeGreaterThan(first.leafLength * 1.3)
    }
  })

  it("grows evenly in every direction", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { stages } = createKimberlyQueen(seed)
      const aspect = stages[0].height / stages[0].halfWidth
      for (const st of stages) {
        expect(st.height / st.halfWidth).toBeCloseTo(aspect, 9)
      }
    }
  })

  it("scales fronds, stems and positions with the rest of the plant", () => {
    // Each stage is the full-size plant scaled about the soil point, so every
    // frond it shares with the last stage is that frond, scaled.
    const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)
    for (const seed of SEEDS) {
      const { stages } = createKimberlyQueen(seed)
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

  it("keeps every frond above the soil and within the side limits", () => {
    for (const seed of SEEDS) {
      for (const st of createKimberlyQueen(seed).stages) {
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

  it("fills the crown at full size", () => {
    // A slim, upright feathery crown fills little at the 2-frond sprout (like
    // the snake plant, whose suite asserts no coverage floor); by the full
    // stage the fronds fill the canopy they enclose.
    for (const seed of SEEDS) {
      const last = createKimberlyQueen(seed).stages.at(-1)!
      expect(last.coverage).toBeGreaterThanOrEqual(0.15)
    }
  })

  it("roots every stem between the configured share of the pot", () => {
    const width = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
    const [lo, hi] = CONFIG.roots.range
    for (const seed of SEEDS) {
      for (const st of createKimberlyQueen(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.stem.x0).toBeGreaterThanOrEqual(CONFIG.pot.rimLeft + width * lo - 1)
          expect(leaf.stem.x0).toBeLessThanOrEqual(CONFIG.pot.rimLeft + width * hi + 1)
        }
      }
    }
  })

  it("keeps each frond's identity and shape across stages", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const { stages } = createKimberlyQueen(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const same = last.leaves.find((l) => l.index === leaf.index)
          expect(same?.spec).toEqual(leaf.spec)
        }
      }
    }
  })

  it("has no flowers", () => {
    expect(renderToStaticMarkup(<KimberlyQueen seed={7} stage={4} />)).not.toContain("data-flower")
  })
})

describe("outer frond fan", () => {
  const fan = CONFIG.fan!
  const rimWidth = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
  const rootHalfRange = (rimWidth * (CONFIG.roots.range[1] - CONFIG.roots.range[0])) / 2
  const lastStage = (seed: number) => {
    const { stages } = createKimberlyQueen(seed)
    return stages[stages.length - 1]
  }

  it("fans only the fronds rooted toward the outside", () => {
    for (const seed of SEEDS) {
      for (const leaf of lastStage(seed).leaves) {
        const outward = Math.abs(leaf.stem.x0 - ANCHOR.x) / rootHalfRange
        if (outward >= fan.outerThreshold + 1e-9) expect(leaf.fan).not.toBe(0)
        if (outward < fan.outerThreshold - 1e-9) expect(leaf.fan).toBe(0)
      }
    }
  })

  it("has some fanned fronds and some that are not", () => {
    const fans = SEEDS.flatMap((seed) => lastStage(seed).leaves.map((l) => l.fan !== 0))
    expect(fans).toContain(true)
    expect(fans).toContain(false)
  })

  it("bends each outer frond away from the middle, tip and all", () => {
    for (const seed of SEEDS) {
      for (const leaf of lastStage(seed).leaves.filter((l) => l.fan !== 0)) {
        // Left of the middle bends left, right of it bends right.
        expect(Math.sign(leaf.fan)).toBe(Math.sign(leaf.stem.x0 - ANCHOR.x))
        expect(Math.abs(leaf.fan)).toBeGreaterThanOrEqual(fan.strength[0])
        expect(Math.abs(leaf.fan)).toBeLessThanOrEqual(fan.strength[1])
        // The lance's tip swings the same way, past its base.
        const outline = kimberlyFrondOutline(leaf.spec, 1, 8, leaf.fan)
        const tip = outline.reduce((a, b) => (b[1] < a[1] ? b : a))
        expect(Math.sign(tip[0])).toBe(Math.sign(leaf.fan))
      }
    }
  })

  it("leaves the upright fronds exactly as they were", () => {
    for (const seed of SEEDS) {
      for (const leaf of lastStage(seed).leaves.filter((l) => l.fan === 0)) {
        expect(kimberlyFrondOutline(leaf.spec, 1, 8, 0)).toEqual(kimberlyFrondOutline(leaf.spec, 1, 8))
      }
    }
  })

  it("keeps each frond's bend the same at every stage", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const last = lastStage(seed)
      for (const st of createKimberlyQueen(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.fan).toBe(last.leaves.find((l) => l.index === leaf.index)!.fan)
        }
      }
    }
  })

  it("draws a fan===0 frond byte-for-byte as it did before fanning", () => {
    for (const seed of [1, 7, 23]) {
      const spec = randomKimberlyFrond(mulberry32(seed))
      const withFan = renderToStaticMarkup(<KimberlyFrondShape spec={spec} length={90} clipId="c" fan={0} />)
      const without = renderToStaticMarkup(<KimberlyFrondShape spec={spec} length={90} clipId="c" />)
      expect(withFan).toBe(without)
    }
  })
})

describe("scale redraw", () => {
  const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")

  it("only changes the picture size, never frond or stem placement", () => {
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<KimberlyQueen seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<KimberlyQueen seed={7} stage={stage} scale={0.4} />)
      const c = renderToStaticMarkup(<KimberlyQueen seed={7} stage={stage} scale={1.7} />)
      expect(strip(b)).toBe(strip(a))
      expect(strip(c)).toBe(strip(a))
    }
  })
})
