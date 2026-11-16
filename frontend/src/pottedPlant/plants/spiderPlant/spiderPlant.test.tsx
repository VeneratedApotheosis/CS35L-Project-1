import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { SpiderLeafShape } from "./SpiderLeafShape"
import { SpiderPlant } from "./SpiderPlant"
import { SPIDER_BLADE, SPIDER_LEAF_RANGES, randomSpiderLeaf, spiderBladeSides, spiderLeafOutline } from "./spiderLeaf"
import { SPIDER_PLANT_CONFIG } from "./spiderPlantConfig"
import { createSpiderPlant, leafOutline, stageLeafCounts } from "./spiderPlantStages"
import { mulberry32 } from "../../rng"

// Growing 40 plants of up to 22 blades is slow when the whole suite runs at once.
vi.setConfig({ testTimeout: 30000 })

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)
const EPS = 1e-6
const CONFIG = SPIDER_PLANT_CONFIG
const LIMITS = CONFIG.limits
const ANCHOR = CONFIG.dome.anchor

const lastStage = (seed: number) => createSpiderPlant(seed).stages.at(-1)!

describe("stage ladder", () => {
  it("gives 3, 9, 16, 22 blades for four stages", () => {
    expect(stageLeafCounts(4)).toEqual([3, 9, 16, 22])
  })

  it("caps the full plant at twenty-two blades", () => {
    expect(CONFIG.stages.maxLeaves).toBe(22)
  })

  it("never exceeds the blade cap for any stage count", () => {
    for (let s = 1; s <= CONFIG.stages.max; s++) {
      for (const n of stageLeafCounts(s)) expect(n).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
    }
  })
})

describe("generated spider plant", () => {
  it("is deterministic", () => {
    expect(createSpiderPlant(7)).toEqual(createSpiderPlant(7))
  })

  it("builds exactly the requested number of stages and renders", () => {
    for (const stages of [1, 3, 4, 6]) {
      expect(createSpiderPlant(7, { stages }).stages).toHaveLength(stages)
    }
    expect(renderToStaticMarkup(<SpiderPlant seed={7} stage={4} />)).toContain("<svg")
  })

  it("never draws more than the configured blade cap, and is full at the last stage", () => {
    for (const seed of SEEDS) {
      for (const st of createSpiderPlant(seed).stages) {
        expect(st.leaves.length).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
      }
      expect(lastStage(seed).leaves.length).toBeGreaterThanOrEqual(20)
    }
  })

  it("makes the last stage at least 3.6 times the first, with longer blades", () => {
    for (const seed of SEEDS) {
      const { stages } = createSpiderPlant(seed)
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.leafLength).toBeGreaterThan(first.leafLength * 1.3)
    }
  })

  it("grows evenly in every direction", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { stages } = createSpiderPlant(seed)
      const aspect = stages[0].height / stages[0].halfWidth
      for (const st of stages) {
        expect(st.height / st.halfWidth).toBeCloseTo(aspect, 9)
      }
    }
  })

  it("scales blades, stems and positions with the rest of the plant", () => {
    const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)
    for (const seed of SEEDS) {
      const { stages } = createSpiderPlant(seed)
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

  it("keeps every blade above the hang floor and within the side limits", () => {
    for (const seed of SEEDS) {
      for (const st of createSpiderPlant(seed).stages) {
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

  it("fills the mound at full size", () => {
    for (const seed of SEEDS) {
      expect(lastStage(seed).coverage).toBeGreaterThanOrEqual(0.15)
    }
  })

  it("lets the outer blades hang below the soil line, over the pot rim", () => {
    expect(LIMITS.floor).toBeGreaterThan(ANCHOR.y)
    expect(LIMITS.floor).toBe(ANCHOR.y + CONFIG.hang!.depth)
    for (const seed of SEEDS) {
      const lowest = Math.max(...lastStage(seed).leaves.flatMap((leaf) => leafOutline(leaf).map(([, y]) => y)))
      expect(lowest).toBeGreaterThan(ANCHOR.y - 10)
      expect(lowest).toBeLessThanOrEqual(LIMITS.floor + EPS)
    }
    // At least half of the plants have a blade that hangs well over the rim.
    const hanging = SEEDS.filter((seed) => Math.max(...lastStage(seed).leaves.flatMap((leaf) => leafOutline(leaf).map(([, y]) => y))) > ANCHOR.y + 6)
    expect(hanging.length).toBeGreaterThanOrEqual(SEEDS.length * 0.5)
  })

  it("has several short, low outer blades on both sides, and no gap in the middle", () => {
    for (const seed of SEEDS) {
      const leaves = lastStage(seed).leaves
      const outer = leaves.filter((leaf) => Math.abs(leaf.angle) >= 55)
      expect(outer.length).toBeGreaterThanOrEqual(3)
      expect(outer.some((leaf) => leaf.angle < 0)).toBe(true)
      expect(outer.some((leaf) => leaf.angle > 0)).toBe(true)

      // Blades pass over the middle of the pot, well above the soil, not just to either side of it.
      const crossing = leaves.filter((leaf) =>
        leafOutline(leaf).some(([x, y]) => Math.abs(x - ANCHOR.x) < 8 && ANCHOR.y - y > 25),
      )
      expect(crossing.length).toBeGreaterThanOrEqual(2)
    }
  })

  it("roots every stem between the configured share of the pot", () => {
    const width = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
    const [lo, hi] = CONFIG.roots.range
    for (const seed of SEEDS) {
      for (const st of createSpiderPlant(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.stem.x0).toBeGreaterThanOrEqual(CONFIG.pot.rimLeft + width * lo - 1)
          expect(leaf.stem.x0).toBeLessThanOrEqual(CONFIG.pot.rimLeft + width * hi + 1)
        }
      }
    }
  })

  it("keeps each blade's identity and shape across stages", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const { stages } = createSpiderPlant(seed)
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
    expect(renderToStaticMarkup(<SpiderPlant seed={7} stage={4} />)).not.toContain("data-flower")
  })
})

describe("spider blade", () => {
  it("is very thin", () => {
    const [lo, hi] = SPIDER_LEAF_RANGES.aspect
    expect(lo).toBeGreaterThanOrEqual(0.06)
    expect(hi).toBeLessThanOrEqual(0.1)
    for (const seed of SEEDS) {
      const spec = randomSpiderLeaf(mulberry32(seed))
      expect(spec.aspect).toBeGreaterThanOrEqual(lo)
      expect(spec.aspect).toBeLessThanOrEqual(hi)
    }
  })

  it("rises straight at the base when not fanned", () => {
    const spec = randomSpiderLeaf(mulberry32(3))
    const { mid } = spiderBladeSides(spec, 100, 20, 0)
    for (const [x] of mid) expect(x).toBeCloseTo(0, 9)
    expect(mid.at(-1)![1]).toBeCloseTo(-100, 6)
  })

  it("drops its tip below its highest point when fanned", () => {
    for (const seed of SEEDS) {
      const spec = randomSpiderLeaf(mulberry32(seed))
      const { mid } = spiderBladeSides(spec, 100, 40, 1)
      const highest = Math.min(...mid.map(([, y]) => y))
      expect(mid.at(-1)![1]).toBeGreaterThan(highest + 1)
    }
  })

  it("draws a blade at its full length and full arch when no angle is given", () => {
    const spec = randomSpiderLeaf(mulberry32(5))
    expect(spiderBladeSides(spec, 100, 20, 0).mid.at(-1)![1]).toBeCloseTo(-100, 6)
    expect(spiderBladeSides(spec, 100, 20, 1).turn).toBeCloseTo(SPIDER_BLADE.bend * spec.droop, 9)
  })

  it("leaves a blade with fan 0 exactly as it was", () => {
    const spec = randomSpiderLeaf(mulberry32(5))
    expect(spiderLeafOutline(spec, 1, 8, 0)).toEqual(spiderLeafOutline(spec, 1, 8))
  })
})

describe("blade arch", () => {
  const fan = CONFIG.fan!

  it("arches every blade, as the fan covers all of them", () => {
    expect(fan.outerThreshold).toBe(0)
    for (const seed of SEEDS) {
      for (const leaf of lastStage(seed).leaves) expect(leaf.fan).not.toBe(0)
    }
  })

  it("bends each blade away from the middle, tip and all, except an inward blade near the middle", () => {
    for (const seed of SEEDS) {
      for (const leaf of lastStage(seed).leaves) {
        expect(Math.abs(leaf.fan)).toBeGreaterThanOrEqual(fan.strength[0])
        expect(Math.abs(leaf.fan)).toBeLessThanOrEqual(fan.strength[1])
        if (leaf.spec.inward && Math.abs(leaf.angle) < SPIDER_BLADE.inwardUntil) continue
        const outline = spiderLeafOutline(leaf.spec, 1, 8, leaf.fan, leaf.angle)
        const farthest = outline.reduce((a, b) => (Math.abs(b[0]) > Math.abs(a[0]) ? b : a))
        expect(Math.sign(farthest[0])).toBe(Math.sign(leaf.fan))
      }
    }
  })

  it("turns an inward blade that points nearly straight up back across the middle", () => {
    const spec = { ...randomSpiderLeaf(mulberry32(4)), inward: true }
    const outward = { ...spec, inward: false }
    const inward = spiderBladeSides(spec, 100, 40, 0.8, 4)
    const away = spiderBladeSides(outward, 100, 40, 0.8, 4)
    expect(Math.sign(inward.turn)).toBe(-Math.sign(away.turn))
    // Past inwardUntil the two are the same blade.
    expect(spiderBladeSides(spec, 100, 40, 0.8, 50)).toEqual(spiderBladeSides(outward, 100, 40, 0.8, 50))
  })

  it("draws the outermost blades shorter than the middle ones, and curls them over harder", () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const spec = randomSpiderLeaf(mulberry32(seed))
      const middle = spiderBladeSides(spec, 100, 40, 0.8, 38)
      const outer = spiderBladeSides(spec, 100, 40, 0.8, 80)
      const reach = (mid: [number, number][]) => Math.hypot(mid.at(-1)![0], mid.at(-1)![1])
      expect(reach(outer.mid)).toBeLessThan(reach(middle.mid) * 0.6)
      // By the tip the outer blade points down (heading from straight up, plus its own angle, is past 90).
      expect(80 + Math.abs(outer.turn)).toBeGreaterThan(130)
    }
  })

  it("keeps each blade's bend the same at every stage", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const last = lastStage(seed)
      for (const st of createSpiderPlant(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.fan).toBe(last.leaves.find((l) => l.index === leaf.index)!.fan)
        }
      }
    }
  })
})

describe("blade drawing", () => {
  it("draws a cream stripe down the blade", () => {
    const spec = randomSpiderLeaf(mulberry32(9))
    const html = renderToStaticMarkup(<SpiderLeafShape spec={spec} length={90} clipId="c" fan={0.8} />)
    expect(html).toContain("hsl(52 62% 90%)")
  })

  it("draws the same blade every time", () => {
    const spec = randomSpiderLeaf(mulberry32(9))
    const a = renderToStaticMarkup(<SpiderLeafShape spec={spec} length={90} clipId="c" fan={-0.7} />)
    const b = renderToStaticMarkup(<SpiderLeafShape spec={spec} length={90} clipId="c" fan={-0.7} />)
    expect(a).toBe(b)
  })
})

describe("scale redraw", () => {
  const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")

  it("only changes the picture size, never blade or stem placement", () => {
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<SpiderPlant seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<SpiderPlant seed={7} stage={stage} scale={0.4} />)
      const c = renderToStaticMarkup(<SpiderPlant seed={7} stage={stage} scale={1.7} />)
      expect(strip(b)).toBe(strip(a))
      expect(strip(c)).toBe(strip(a))
    }
  })
})
