import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PeaceLily } from "./PeaceLily"
import { flowerDome, flowerSpread, flowerState } from "./flowers"
import { FLOWER_CONFIG, PEACE_LILY_CONFIG } from "./peaceLilyConfig"
import { createPeaceLily, leafOutline } from "./peaceLilyStages"
import { lilyLeafOutline } from "./leaf"
import { createPothos } from "../pothos/pothosStages"
import { domeValue } from "../staged/dome"
import { placeOutline } from "../geometry"
import { bladeOutline } from "./shape"
import { BLOOM_SHAPE } from "./peaceLilyConfig"

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const EPS = 1e-6
const LIMITS = PEACE_LILY_CONFIG.limits
const SOIL = PEACE_LILY_CONFIG.dome.anchor

describe("flower stages", () => {
  it("shows nothing, then buds, then blooms", () => {
    expect([1, 2, 3, 4].map((s) => flowerState(s, FLOWER_CONFIG))).toEqual(["none", "none", "bud", "bloom"])
  })

  it("draws no flowers in stages 1 and 2, buds in 3 and open flowers in 4", () => {
    const count = (html: string, kind: string) => html.split('data-flower="' + kind + '"').length - 1
    for (const seed of SEEDS.slice(0, 20)) {
      const flowers = createPeaceLily(seed).flowers.length
      const html = [1, 2, 3, 4].map((stage) => renderToStaticMarkup(<PeaceLily seed={seed} stage={stage} />))
      expect(html[0]).not.toContain("data-flower")
      expect(html[1]).not.toContain("data-flower")
      expect(count(html[2], "bud")).toBe(flowers)
      expect(count(html[2], "bloom")).toBe(0)
      expect(count(html[3], "bloom")).toBe(flowers)
      expect(count(html[3], "bud")).toBe(0)
    }
  })
})

describe("flowers", () => {
  it("is deterministic", () => {
    expect(createPeaceLily(7)).toEqual(createPeaceLily(7))
  })

  it("gives every plant the configured number of flowers", () => {
    for (const seed of SEEDS) {
      const n = createPeaceLily(seed).flowers.length
      expect(n).toBeGreaterThanOrEqual(FLOWER_CONFIG.count[0])
      expect(n).toBeLessThanOrEqual(FLOWER_CONFIG.count[1])
    }
  })

  it("keeps every open flower inside the flower dome, above the soil and within the side limits", () => {
    const dome = flowerDome(PEACE_LILY_CONFIG, FLOWER_CONFIG)
    for (const seed of SEEDS) {
      for (const f of createPeaceLily(seed).flowers) {
        const outline = placeOutline(bladeOutline({ ...BLOOM_SHAPE, aspect: BLOOM_SHAPE.aspect * f.widthFactor }, f.length, 12), { x: f.baseX, y: f.baseY }, f.angle)
        for (const [x, y] of outline) {
          expect(domeValue(dome, x, y)).toBeLessThanOrEqual(1 + EPS)
          expect(x).toBeGreaterThanOrEqual(LIMITS.left - EPS)
          expect(x).toBeLessThanOrEqual(LIMITS.right + EPS)
          expect(y).toBeLessThanOrEqual(LIMITS.floor + EPS)
        }
      }
    }
  })

  it("keeps every flower head within 30 degrees of straight up from the soil point", () => {
    expect(FLOWER_CONFIG.maxSpread).toBe(30)
    for (const seed of SEEDS) {
      for (const f of createPeaceLily(seed).flowers) {
        expect(flowerSpread(f, SOIL)).toBeLessThanOrEqual(FLOWER_CONFIG.maxSpread + 0.01)
      }
    }
  })

  it("spreads flowers out toward that limit rather than stacking them in the middle", () => {
    const widest = SEEDS.map((seed) => Math.max(...createPeaceLily(seed).flowers.map((f) => flowerSpread(f, SOIL))))
    expect(Math.max(...widest)).toBeGreaterThan(FLOWER_CONFIG.maxSpread - 3)
  })

  it("starts flower stalks inside the middle half of the pot", () => {
    const width = PEACE_LILY_CONFIG.pot.rimRight - PEACE_LILY_CONFIG.pot.rimLeft
    const [lo, hi] = PEACE_LILY_CONFIG.roots.range
    for (const seed of SEEDS) {
      for (const f of createPeaceLily(seed).flowers) {
        expect(f.stalk.x0).toBeGreaterThanOrEqual(PEACE_LILY_CONFIG.pot.rimLeft + width * lo - EPS)
        expect(f.stalk.x0).toBeLessThanOrEqual(PEACE_LILY_CONFIG.pot.rimLeft + width * hi + EPS)
      }
    }
  })

  it("puts the top of every flower between 60% and 120% of the plant's maximum height", () => {
    const maxHeight = PEACE_LILY_CONFIG.dome.height
    const [low, high] = FLOWER_CONFIG.height
    for (const seed of SEEDS) {
      for (const f of createPeaceLily(seed).flowers) {
        const top = Math.min(
          ...placeOutline(
            bladeOutline({ ...BLOOM_SHAPE, aspect: BLOOM_SHAPE.aspect * f.widthFactor }, f.length, 12),
            { x: f.baseX, y: f.baseY },
            f.angle,
          ).map(([, y]) => y),
        )
        const share = (SOIL.y - top) / maxHeight
        expect(share).toBeGreaterThanOrEqual(low - 0.02)
        expect(share).toBeLessThanOrEqual(high + 0.02)
      }
    }
  })

  it("reaches the low and the high end of that range across plants", () => {
    const tops = SEEDS.flatMap((seed) =>
      createPeaceLily(seed).flowers.map((f) => (SOIL.y - Math.min(...placeOutline(bladeOutline({ ...BLOOM_SHAPE, aspect: BLOOM_SHAPE.aspect * f.widthFactor }, f.length, 12), { x: f.baseX, y: f.baseY }, f.angle).map(([, y]) => y))) / PEACE_LILY_CONFIG.dome.height),
    )
    expect(Math.min(...tops)).toBeLessThan(0.8)
    expect(Math.max(...tops)).toBeGreaterThan(1.0)
  })

  it("never overlaps one flower head on another", () => {
    for (const seed of SEEDS) {
      const { flowers } = createPeaceLily(seed)
      for (let i = 0; i < flowers.length; i++) {
        for (let j = i + 1; j < flowers.length; j++) {
          const gap = Math.hypot(flowers[i].baseX - flowers[j].baseX, flowers[i].baseY - flowers[j].baseY)
          expect(gap).toBeGreaterThan(flowers[i].length * 0.3)
        }
      }
    }
  })
})

describe("leaves", () => {
  it("builds four stages with at most 8 leaves", () => {
    expect(PEACE_LILY_CONFIG.stages.maxLeaves).toBe(8)
    for (const seed of SEEDS) {
      const { stages } = createPeaceLily(seed)
      expect(stages).toHaveLength(4)
      expect(stages[stages.length - 1].leaves).toHaveLength(8)
      for (const st of stages) expect(st.leaves.length).toBeLessThanOrEqual(PEACE_LILY_CONFIG.stages.maxLeaves)
    }
  })

  it("keeps every leaf above the soil and within the side limits", () => {
    for (const seed of SEEDS) {
      for (const st of createPeaceLily(seed).stages) {
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

  it("scales leaves with the rest of the plant", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { stages } = createPeaceLily(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const full = last.leaves.find((l) => l.index === leaf.index)!
          expect(leaf.length / st.scale).toBeCloseTo(full.length, 6)
          expect((leaf.baseX - SOIL.x) / st.scale).toBeCloseTo(full.baseX - SOIL.x, 6)
        }
      }
    }
  })
})

describe("outer leaf fan", () => {
  const fan = PEACE_LILY_CONFIG.fan!
  const rimWidth = PEACE_LILY_CONFIG.pot.rimRight - PEACE_LILY_CONFIG.pot.rimLeft
  const rootHalfRange = (rimWidth * (PEACE_LILY_CONFIG.roots.range[1] - PEACE_LILY_CONFIG.roots.range[0])) / 2
  const lastStage = (seed: number) => {
    const { stages } = createPeaceLily(seed)
    return stages[stages.length - 1]
  }

  it("fans only the leaves rooted toward the outside", () => {
    for (const seed of SEEDS) {
      for (const leaf of lastStage(seed).leaves) {
        const outward = Math.abs(leaf.stem.x0 - SOIL.x) / rootHalfRange
        if (outward >= fan.outerThreshold + 1e-9) expect(leaf.fan).not.toBe(0)
        if (outward < fan.outerThreshold - 1e-9) expect(leaf.fan).toBe(0)
      }
    }
  })

  it("has some outer leaves and some that are not", () => {
    const fans = SEEDS.flatMap((seed) => lastStage(seed).leaves.map((l) => l.fan !== 0))
    expect(fans).toContain(true)
    expect(fans).toContain(false)
  })

  it("bends each outer leaf away from the middle", () => {
    for (const seed of SEEDS) {
      for (const leaf of lastStage(seed).leaves.filter((l) => l.fan !== 0)) {
        // Left of the middle bends left, right of it bends right.
        expect(Math.sign(leaf.fan)).toBe(Math.sign(leaf.stem.x0 - SOIL.x))
        expect(Math.abs(leaf.fan)).toBeGreaterThanOrEqual(fan.strength[0])
        expect(Math.abs(leaf.fan)).toBeLessThanOrEqual(fan.strength[1])
        // The blade's tip swings the same way, past its base.
        const outline = lilyLeafOutline(leaf.spec, 1, 8, leaf.fan)
        const tip = outline.reduce((a, b) => (b[1] < a[1] ? b : a))
        expect(Math.sign(tip[0])).toBe(Math.sign(leaf.fan))
      }
    }
  })

  it("leaves the other leaves exactly as they were", () => {
    for (const seed of SEEDS) {
      for (const leaf of lastStage(seed).leaves.filter((l) => l.fan === 0)) {
        expect(lilyLeafOutline(leaf.spec, 1, 8, 0)).toEqual(lilyLeafOutline(leaf.spec, 1, 8))
      }
    }
  })

  it("keeps each leaf's bend the same at every stage", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const last = lastStage(seed)
      for (const st of createPeaceLily(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.fan).toBe(last.leaves.find((l) => l.index === leaf.index)!.fan)
        }
      }
    }
  })

  it("does not fan a plant whose config has no fan, such as the pothos", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      for (const st of createPothos(seed).stages) {
        for (const leaf of st.leaves) expect(leaf.fan).toBe(0)
      }
    }
  })
})

describe("scale", () => {
  const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")

  it("only changes the picture size, never leaf, stem or flower placement", () => {
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<PeaceLily seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<PeaceLily seed={7} stage={stage} scale={0.4} />)
      expect(strip(b)).toBe(strip(a))
    }
  })
})
