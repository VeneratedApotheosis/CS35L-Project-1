import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { placeOutline } from "../geometry"
import { flowerDome, flowerSpread, flowerState } from "../peaceLily/flowers"
import { bladeOutline } from "../peaceLily/shape"
import { domeValue } from "../staged/dome"
import { Lily } from "./Lily"
import { BLOOM_SHAPE, FLOWER_CONFIG, LILY_CONFIG } from "./lilyConfig"
import { createLily, leafOutline } from "./lilyStages"

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)
const EPS = 1e-6
const LIMITS = LILY_CONFIG.limits
const SOIL = LILY_CONFIG.dome.anchor

describe("lily leaves", () => {
  it("is deterministic", () => {
    expect(createLily(7)).toEqual(createLily(7))
  })

  it("never draws more than the configured leaf cap, and stays within the limits", () => {
    for (const seed of SEEDS) {
      for (const stage of createLily(seed).stages) {
        expect(stage.leaves.length).toBeLessThanOrEqual(LILY_CONFIG.stages.maxLeaves)
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
})

describe("lily flowers", () => {
  it("shows nothing, then buds, then blooms", () => {
    expect([1, 2, 3, 4].map((s) => flowerState(s, FLOWER_CONFIG))).toEqual(["none", "none", "bud", "bloom"])
  })

  it("draws buds in stage 3 and open flowers in stage 4", () => {
    const count = (html: string, kind: string) => html.split('data-flower="' + kind + '"').length - 1
    for (const seed of SEEDS.slice(0, 20)) {
      const flowers = createLily(seed).flowers.length
      const html = [1, 2, 3, 4].map((stage) => renderToStaticMarkup(<Lily seed={seed} stage={stage} />))
      expect(html[0]).not.toContain("data-flower")
      expect(html[1]).not.toContain("data-flower")
      expect(count(html[2], "bud")).toBe(flowers)
      expect(count(html[3], "bloom")).toBe(flowers)
    }
  })

  it("gives every plant the configured number of flowers", () => {
    for (const seed of SEEDS) {
      const n = createLily(seed).flowers.length
      expect(n).toBeGreaterThanOrEqual(FLOWER_CONFIG.count[0])
      expect(n).toBeLessThanOrEqual(FLOWER_CONFIG.count[1])
    }
  })

  it("keeps every bloom inside the flower dome, above the soil and within the side limits", () => {
    const dome = flowerDome(LILY_CONFIG, FLOWER_CONFIG)
    for (const seed of SEEDS) {
      for (const f of createLily(seed).flowers) {
        const outline = placeOutline(
          bladeOutline({ ...BLOOM_SHAPE, aspect: BLOOM_SHAPE.aspect * f.widthFactor }, f.length, 12),
          { x: f.baseX, y: f.baseY },
          f.angle,
        )
        for (const [x, y] of outline) {
          expect(domeValue(dome, x, y)).toBeLessThanOrEqual(1 + EPS)
          expect(x).toBeGreaterThanOrEqual(LIMITS.left - EPS)
          expect(x).toBeLessThanOrEqual(LIMITS.right + EPS)
          expect(y).toBeLessThanOrEqual(LIMITS.floor + EPS)
        }
      }
    }
  })

  it("keeps every flower head within its spread limit from straight up", () => {
    for (const seed of SEEDS) {
      for (const f of createLily(seed).flowers) {
        expect(flowerSpread(f, SOIL)).toBeLessThanOrEqual(FLOWER_CONFIG.maxSpread + 0.01)
      }
    }
  })
})
