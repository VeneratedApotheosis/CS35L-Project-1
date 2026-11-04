import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PeaceLily } from "./PeaceLily"
import { flowerDome, flowerState } from "./flowers"
import { FLOWER_CONFIG, PEACE_LILY_CONFIG } from "./peaceLilyConfig"
import { createPeaceLily, leafOutline } from "./peaceLilyStages"
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

  it("stands taller than the leaves", () => {
    for (const seed of SEEDS) {
      const plant = createPeaceLily(seed)
      const leaves = plant.stages[plant.stages.length - 1].leaves
      const leafTop = Math.min(...leaves.flatMap((l) => leafOutline(l).map(([, y]) => y)))
      const flowerTop = Math.min(
        ...plant.flowers.flatMap((f) =>
          placeOutline(
            bladeOutline({ ...BLOOM_SHAPE, aspect: BLOOM_SHAPE.aspect * f.widthFactor }, f.length, 12),
            { x: f.baseX, y: f.baseY },
            f.angle,
          ).map(([, y]) => y),
        ),
      )
      // The tallest flower clears the tallest leaf.
      expect(flowerTop).toBeLessThan(leafTop)
    }
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
  it("builds four stages with at most 6 leaves", () => {
    for (const seed of SEEDS) {
      const { stages } = createPeaceLily(seed)
      expect(stages).toHaveLength(4)
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
