import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Pothos } from "./Pothos"
import {
  BOUNDS,
  ENVELOPE,
  GROWTH_RATIO,
  MAX_LAYERS,
  MAX_LEAVES,
  POT_RIM,
  ROOT_RANGE,
  createPothos,
  leafOutline,
  stageLeafCounts,
} from "./pothosStages"

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const EPS = 1e-6

describe("stage ladder", () => {
  it("gives 2, 3, 5, 6 leaves for four stages", () => {
    expect(stageLeafCounts(4)).toEqual([2, 3, 5, 6])
  })

  it("never exceeds the leaf cap for any stage count", () => {
    for (let s = 1; s <= 9; s++) {
      for (const n of stageLeafCounts(s)) expect(n).toBeLessThanOrEqual(MAX_LEAVES)
    }
  })
})

describe("generated plants", () => {
  it("builds exactly the requested number of stages", () => {
    for (const stages of [1, 3, 4, 6]) {
      expect(createPothos(7, { stages }).stages).toHaveLength(stages)
    }
  })

  it("is deterministic", () => {
    expect(createPothos(7)).toEqual(createPothos(7))
  })

  it("has at most 6 leaves in every stage", () => {
    for (const seed of SEEDS) {
      for (const st of createPothos(seed).stages) {
        expect(st.leaves.length).toBeLessThanOrEqual(MAX_LEAVES)
      }
    }
  })

  it("makes the last stage much larger than the first", () => {
    for (const seed of SEEDS) {
      const { stages } = createPothos(seed)
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(GROWTH_RATIO - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(GROWTH_RATIO - 0.01)
      expect(last.leafLength).toBeGreaterThan(first.leafLength * 1.3)
    }
  })

  it("changes visibly at every step", () => {
    for (const seed of SEEDS) {
      const { stages } = createPothos(seed)
      for (let k = 1; k < stages.length; k++) {
        expect(stages[k].halfWidth / stages[k - 1].halfWidth).toBeGreaterThanOrEqual(1.25)
        expect(stages[k].leaves.length).toBeGreaterThan(stages[k - 1].leaves.length)
        expect(stages[k].leafLength).toBeGreaterThan(stages[k - 1].leafLength)
      }
    }
  })

  it("grows evenly in every direction", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { stages } = createPothos(seed)
      const aspect = stages[0].height / stages[0].halfWidth
      for (const st of stages) {
        expect(st.height / st.halfWidth).toBeCloseTo(aspect, 9)
      }
    }
  })

  it("scales leaves, stems and positions with the rest of the plant", () => {
    // Each stage is the full-size plant scaled about the soil point, so every
    // leaf it shares with the last stage is that leaf, scaled.
    const soil = { x: ENVELOPE.anchor.x, y: ENVELOPE.anchor.y }
    const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)
    for (const seed of SEEDS) {
      const { stages } = createPothos(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const full = last.leaves.find((l) => l.index === leaf.index)!
          close(leaf.length / st.scale, full.length)
          close((leaf.baseX - soil.x) / st.scale, full.baseX - soil.x)
          close((soil.y - leaf.baseY) / st.scale, soil.y - full.baseY)
          close((leaf.stem.x0 - soil.x) / st.scale, full.stem.x0 - soil.x)
          close(leaf.angle, full.angle)
        }
      }
    }
  })

  it("keeps every leaf above the soil and within the side limits", () => {
    for (const seed of SEEDS) {
      for (const st of createPothos(seed).stages) {
        for (const leaf of st.leaves) {
          for (const [x, y] of leafOutline(leaf)) {
            expect(x).toBeGreaterThanOrEqual(BOUNDS.left - EPS)
            expect(x).toBeLessThanOrEqual(BOUNDS.right + EPS)
            expect(y).toBeLessThanOrEqual(BOUNDS.floor + EPS)
          }
        }
      }
    }
  })

  it("fills the canopy it encloses", () => {
    for (const seed of SEEDS) {
      for (const st of createPothos(seed).stages) {
        expect(st.coverage).toBeGreaterThanOrEqual(0.15)
      }
    }
  })

  it("keeps leaf layers low", () => {
    for (const seed of SEEDS) {
      for (const st of createPothos(seed).stages) {
        expect(st.layers).toBeLessThanOrEqual(MAX_LAYERS + 0.15)
      }
    }
  })

  it("gives every leaf a stem long enough to see", () => {
    for (const seed of SEEDS) {
      for (const st of createPothos(seed).stages) {
        for (const leaf of st.leaves) {
          const len = Math.hypot(leaf.stem.x1 - leaf.stem.x0, leaf.stem.y1 - leaf.stem.y0)
          expect(len).toBeGreaterThanOrEqual(st.height * 0.12 - EPS)
        }
      }
    }
  })

  it("starts stems between 25% and 75% of the way across the pot", () => {
    const width = POT_RIM.right - POT_RIM.left
    const lo = POT_RIM.left + width * ROOT_RANGE[0]
    const hi = POT_RIM.left + width * ROOT_RANGE[1]
    for (const seed of SEEDS) {
      for (const st of createPothos(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.stem.x0).toBeGreaterThanOrEqual(lo - EPS)
          expect(leaf.stem.x0).toBeLessThanOrEqual(hi + EPS)
        }
      }
    }
  })

  it("does not start every stem from one point", () => {
    for (const seed of SEEDS) {
      const { stages } = createPothos(seed)
      const last = stages[stages.length - 1]
      const xs = last.leaves.map((l) => l.stem.x0)
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(16)
    }
  })

  it("puts leaves at different distances from the origin", () => {
    for (const seed of SEEDS) {
      for (const st of createPothos(seed).stages.filter((s) => s.leaves.length >= 5)) {
        const lengths = st.leaves.map((l) => Math.hypot(l.stem.x1 - l.stem.x0, l.stem.y1 - l.stem.y0))
        expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThanOrEqual(st.height * 0.06)
      }
    }
  })

  it("keeps each leaf's identity and shape across stages", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const { stages } = createPothos(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const same = last.leaves.find((l) => l.index === leaf.index)
          expect(same?.spec).toEqual(leaf.spec)
        }
      }
    }
  })
})

describe("scale", () => {
  const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")

  it("only changes the picture size, never leaf or stem placement", () => {
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<Pothos seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<Pothos seed={7} stage={stage} scale={0.4} />)
      const c = renderToStaticMarkup(<Pothos seed={7} stage={stage} scale={1.7} />)
      expect(strip(b)).toBe(strip(a))
      expect(strip(c)).toBe(strip(a))
    }
  })
})
