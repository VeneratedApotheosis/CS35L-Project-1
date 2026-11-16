import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { pointInPolygon } from "../../geometry"
import { mulberry32 } from "../../rng"
import { Calathea } from "./Calathea"
import { CalatheaLeafShape } from "./CalatheaLeafShape"
import { calatheaLeafOutline, calatheaStripesPath, fannedCalatheaShape, randomCalatheaLeaf } from "./calatheaLeaf"
import { CALATHEA_CONFIG } from "./calatheaConfig"
import { createCalathea, leafOutline, stageLeafCounts } from "./calatheaStages"

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const EPS = 1e-6
const CONFIG = CALATHEA_CONFIG
const LIMITS = CONFIG.limits
const ANCHOR = CONFIG.dome.anchor

describe("stage ladder", () => {
  it("gives 2, 5, 8, 11 leaves for four stages", () => {
    expect(stageLeafCounts(4)).toEqual([2, 5, 8, 11])
  })

  it("never exceeds the leaf cap for any stage count", () => {
    for (let s = 1; s <= CONFIG.stages.max; s++) {
      for (const n of stageLeafCounts(s)) expect(n).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
    }
  })
})

describe("generated calathea", () => {
  it("is deterministic", () => {
    expect(createCalathea(7)).toEqual(createCalathea(7))
  })

  it("builds exactly the requested number of stages and renders", () => {
    for (const stages of [1, 3, 4, 6]) {
      expect(createCalathea(7, { stages }).stages).toHaveLength(stages)
    }
    expect(renderToStaticMarkup(<Calathea seed={7} stage={4} />)).toContain("<svg")
  })

  it("never draws more than the configured leaf cap", () => {
    for (const seed of SEEDS) {
      for (const st of createCalathea(seed).stages) {
        expect(st.leaves.length).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
      }
    }
  })

  it("makes the last stage at least 3.6 times the first, with longer leaves", () => {
    for (const seed of SEEDS) {
      const { stages } = createCalathea(seed)
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.leafLength).toBeGreaterThan(first.leafLength * 1.3)
    }
  })

  it("grows evenly in every direction", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { stages } = createCalathea(seed)
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
      const { stages } = createCalathea(seed)
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
      for (const st of createCalathea(seed).stages) {
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
      for (const st of createCalathea(seed).stages) {
        // A sprout with two leaves, both fanned out to the sides, covers little of the canopy.
        expect(st.coverage).toBeGreaterThanOrEqual(0.1)
      }
      expect(createCalathea(seed).stages.at(-1)!.coverage).toBeGreaterThanOrEqual(0.4)
    }
  })

  it("roots every stem between 36% and 64% of the way across the pot", () => {
    const width = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
    const [lo, hi] = CONFIG.roots.range
    for (const seed of SEEDS) {
      for (const st of createCalathea(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.stem.x0).toBeGreaterThanOrEqual(CONFIG.pot.rimLeft + width * lo - EPS)
          expect(leaf.stem.x0).toBeLessThanOrEqual(CONFIG.pot.rimLeft + width * hi + EPS)
        }
      }
    }
  })

  it("keeps each coin's identity and shape across stages", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const { stages } = createCalathea(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const same = last.leaves.find((l) => l.index === leaf.index)
          expect(same?.spec).toEqual(leaf.spec)
        }
      }
    }
  })

  it("fans only the outer leaves, outward, and leaves the middle ones straight", () => {
    const halfRange = (CONFIG.roots.range[1] - CONFIG.roots.range[0]) / 2
    let fanned = 0
    let straight = 0
    for (const seed of SEEDS) {
      const last = createCalathea(seed).stages.at(-1)!
      for (const leaf of last.leaves) {
        const out = (leaf.stem.x0 - ANCHOR.x) / ((CONFIG.pot.rimRight - CONFIG.pot.rimLeft) * last.scale)
        const outward = Math.abs(out) / halfRange
        if (leaf.fan === 0) {
          straight++
          expect(outward).toBeLessThan(CONFIG.fan!.outerThreshold + EPS)
        } else {
          fanned++
          expect(Math.sign(leaf.fan)).toBe(Math.sign(out))
          expect(Math.abs(leaf.fan)).toBeGreaterThanOrEqual(CONFIG.fan!.strength[0] - EPS)
          expect(Math.abs(leaf.fan)).toBeLessThanOrEqual(CONFIG.fan!.strength[1] + EPS)
        }
      }
    }
    expect(fanned).toBeGreaterThan(0)
    expect(straight).toBeGreaterThan(0)
  })

  it("layers the leaves: a low skirt pointing out on both sides, a middle ring, and an upright top", () => {
    const { outward, upright } = CONFIG.layerAngle!
    const height = (leaf: { baseY: number }) => ANCHOR.y - leaf.baseY
    let skirt = 0
    let ring = 0
    let top = 0
    let skirtLeft = 0
    let skirtRight = 0
    let skirtHeight = 0
    let topHeight = 0
    for (const seed of SEEDS) {
      const last = createCalathea(seed).stages.at(-1)!
      for (const leaf of last.leaves) {
        const tilt = Math.abs(leaf.angle)
        // Every leaf stays between the lowest and highest layer angles (jitter allowed).
        expect(tilt).toBeLessThanOrEqual(outward + 25)
        if (tilt >= 70) {
          skirt++
          skirtHeight += height(leaf) / last.scale
          if (leaf.angle < 0) skirtLeft++
          else skirtRight++
        } else if (tilt >= 30) ring++
        else if (tilt <= upright + 20) {
          top++
          topHeight += height(leaf) / last.scale
        }
      }
    }
    expect(skirtLeft).toBeGreaterThan(0)
    expect(skirtRight).toBeGreaterThan(0)
    expect(ring).toBeGreaterThan(0)
    expect(top).toBeGreaterThan(0)
    // The skirt hangs low and the upright leaves rise on long stems.
    expect(skirtHeight / skirt).toBeLessThan(topHeight / top - 10)
  })

  it("draws striped leaves clipped to the leaf, with no flowers", () => {
    const html = renderToStaticMarkup(<Calathea seed={7} stage={4} />)
    expect(html).toContain("<clipPath")
    expect(html).toContain("clip-path=")
    expect(html).not.toContain("data-flower")
  })
})

describe("calathea leaf pattern", () => {
  const LENGTH = 100
  const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

  it("keeps every stripe corner inside the leaf outline", () => {
    for (const seed of SEEDS) {
      const spec = randomCalatheaLeaf(mulberry32(seed))
      const outline = calatheaLeafOutline(spec, LENGTH, 40)
      const stripes = numbers(calatheaStripesPath(spec, LENGTH))
      expect(stripes.length).toBeGreaterThan(0)
      for (let i = 0; i < stripes.length; i += 2) {
        expect(pointInPolygon(outline, stripes[i], stripes[i + 1])).toBe(true)
      }
    }
  })

  it("keeps every stripe corner inside the outline of a fanned leaf", () => {
    for (const seed of SEEDS) {
      for (const fan of [-1, -0.75, 0.75, 1]) {
        const spec = fannedCalatheaShape(randomCalatheaLeaf(mulberry32(seed)), fan)
        const outline = calatheaLeafOutline(randomCalatheaLeaf(mulberry32(seed)), LENGTH, 40, fan)
        const stripes = numbers(calatheaStripesPath(spec, LENGTH))
        expect(stripes.length).toBeGreaterThan(0)
        for (let i = 0; i < stripes.length; i += 2) {
          expect(pointInPolygon(outline, stripes[i], stripes[i + 1])).toBe(true)
        }
      }
    }
  })

  it("bends a fanned leaf's tip toward its side and leaves an unfanned leaf as it was", () => {
    const spec = randomCalatheaLeaf(mulberry32(3))
    const tipX = (fan: number) => calatheaLeafOutline(spec, LENGTH, 20, fan).reduce((a, p) => (p[1] < a[1] ? p : a))[0]
    expect(tipX(1)).toBeGreaterThan(tipX(0) + 1)
    expect(tipX(-1)).toBeLessThan(tipX(0) - 1)
    expect(calatheaLeafOutline(spec, LENGTH, 20, 0)).toEqual(calatheaLeafOutline(spec, LENGTH, 20))
  })

  it("draws stripes on both sides of the midrib, sweeping toward the tip", () => {
    const spec = randomCalatheaLeaf(mulberry32(3))
    const pts = numbers(calatheaStripesPath(spec, LENGTH))
    const xs = pts.filter((_, i) => i % 2 === 0)
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(Math.max(...xs)).toBeGreaterThan(0)
    // Each quad starts at the midrib and ends nearer the tip (smaller y).
    for (let i = 0; i + 7 < pts.length; i += 8) expect(pts[i + 3]).toBeLessThan(pts[i + 1])
  })

  it("is deterministic and uses only flat fills", () => {
    const html = (seed: number) =>
      renderToStaticMarkup(<CalatheaLeafShape spec={randomCalatheaLeaf(mulberry32(seed))} length={LENGTH} clipId="c" />)
    expect(html(5)).toBe(html(5))
    expect(html(5)).not.toContain("Gradient")
  })
})

describe("scale", () => {
  const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")

  it("only changes the picture size, never leaf or stem placement", () => {
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<Calathea seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<Calathea seed={7} stage={stage} scale={0.4} />)
      const c = renderToStaticMarkup(<Calathea seed={7} stage={stage} scale={1.7} />)
      expect(strip(b)).toBe(strip(a))
      expect(strip(c)).toBe(strip(a))
    }
  })
})
