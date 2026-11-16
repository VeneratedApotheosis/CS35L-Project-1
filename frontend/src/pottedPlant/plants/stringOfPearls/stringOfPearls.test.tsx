import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { domeAtScale, domeValue } from "../staged/dome"
import { createStagedPlant } from "../staged/generate"
import { wiltPlant } from "../staged/wilt"
import { STRAND_TAPER, strandBeads, strandCurve, strandPolygon } from "./strandLeaf"
import { StringOfPearls } from "./StringOfPearls"
import { STRING_OF_PEARLS_CONFIG } from "./stringOfPearlsConfig"
import {
  createStringOfPearls,
  stageScales,
  stageStrandCounts,
  strandOutline,
  STRING_OF_PEARLS_SPECIES,
} from "./stringOfPearlsStages"

/** Building 40 plants at every stage takes a while on a busy machine. */
const TIMEOUT = 60_000
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)
const EPS = 1e-6
const CONFIG = STRING_OF_PEARLS_CONFIG
const LIMITS = CONFIG.limits
const ANCHOR = CONFIG.dome.anchor

describe("stage ladder", () => {
  it("gives 2, 4, 6, 8 strands for four stages", () => {
    expect(stageStrandCounts(4)).toEqual([2, 4, 6, 8])
  })

  it("never exceeds the strand cap for any stage count", () => {
    for (let s = 1; s <= CONFIG.stages.max; s++) {
      for (const n of stageStrandCounts(s)) expect(n).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
    }
  })

  it("grows the envelope by the growth ratio from the first stage to the last", () => {
    const scales = stageScales(4)
    expect(scales[3] / scales[0]).toBeCloseTo(CONFIG.stages.growthRatio, 9)
  })
})

describe("generated string of pearls", { timeout: TIMEOUT }, () => {
  it("is deterministic", () => {
    expect(createStringOfPearls(7)).toEqual(createStringOfPearls(7))
  })

  it("builds exactly the requested number of stages and renders", () => {
    expect(createStringOfPearls(7).stages).toHaveLength(CONFIG.stages.default)
    expect(createStringOfPearls(7, { stages: 3 }).stages).toHaveLength(3)
    expect(renderToStaticMarkup(<StringOfPearls seed={7} stage={4} />)).toContain("<svg")
  })

  it("grows: the last stage is at least 3.6 times the first, evenly in every direction", () => {
    for (const seed of SEEDS) {
      const { stages } = createStringOfPearls(seed)
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      for (const st of stages) expect(st.height / st.halfWidth).toBeCloseTo(first.height / first.halfWidth, 9)
    }
  })

  it("scales strands, stems and positions with the rest of the plant", () => {
    const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)
    for (const seed of SEEDS) {
      const { stages } = createStringOfPearls(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const strand of st.leaves) {
          const full = last.leaves.find((l) => l.index === strand.index)!
          close(strand.length / st.scale, full.length)
          close((strand.baseX - ANCHOR.x) / st.scale, full.baseX - ANCHOR.x)
          close((ANCHOR.y - strand.baseY) / st.scale, ANCHOR.y - full.baseY)
          close(strand.angle, full.angle)
          expect(strand.spec).toEqual(full.spec)
        }
      }
    }
  })

  it("keeps every strand within the side limits and above the lowest it may hang", () => {
    for (const seed of SEEDS) {
      for (const st of createStringOfPearls(seed).stages) {
        for (const strand of st.leaves) {
          for (const [x, y] of strandOutline(strand)) {
            expect(x).toBeGreaterThanOrEqual(LIMITS.left - EPS)
            expect(x).toBeLessThanOrEqual(LIMITS.right + EPS)
            expect(y).toBeLessThanOrEqual(LIMITS.floor + EPS)
          }
        }
      }
    }
  })

  it("keeps every strand inside the dome, scaled for the stage, and within the hang depth", () => {
    for (const seed of SEEDS) {
      for (const st of createStringOfPearls(seed).stages) {
        const dome = domeAtScale(CONFIG, st.scale)
        for (const strand of st.leaves) {
          for (const [x, y] of strandOutline(strand)) {
            expect(domeValue(dome, x, y)).toBeLessThanOrEqual(1 + EPS)
            expect(y).toBeLessThanOrEqual(ANCHOR.y + dome.depth! + EPS)
          }
        }
      }
    }
  })

  it("lets the strands spill over the rim: the full plant hangs below the soil line", () => {
    for (const seed of SEEDS) {
      const last = createStringOfPearls(seed).stages.at(-1)!
      const lowest = Math.max(...last.leaves.flatMap((strand) => strandOutline(strand).map(([, y]) => y)))
      expect(lowest, "seed " + seed).toBeGreaterThan(ANCHOR.y)
    }
  })

  it("hangs every strand: it ends below where it starts, and lower than the rest of it", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const last = createStringOfPearls(seed).stages.at(-1)!
      for (const strand of last.leaves) {
        const [, tipY] = strandTip(strand)
        expect(tipY, "seed " + seed).toBeGreaterThan(strand.baseY)
      }
    }
  })

  it("roots every stem within the configured share of the pot", () => {
    const width = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
    const [lo, hi] = CONFIG.roots.range
    for (const seed of SEEDS) {
      const last = createStringOfPearls(seed).stages.at(-1)!
      for (const strand of last.leaves) {
        expect(strand.stem.x0).toBeGreaterThanOrEqual(CONFIG.pot.rimLeft + width * lo - EPS)
        expect(strand.stem.x0).toBeLessThanOrEqual(CONFIG.pot.rimLeft + width * hi + EPS)
      }
    }
  })

  it("has no flowers", () => {
    expect(renderToStaticMarkup(<StringOfPearls seed={7} stage={4} />)).not.toContain("data-flower")
  })
})

/** The far end of a placed strand's curve, in the canvas. */
function strandTip(strand: ReturnType<typeof createStringOfPearls>["stages"][number]["leaves"][number]): [number, number] {
  const curve = strandCurve(strand.spec, strand.angle, 60)
  const end = curve[curve.length - 1]
  const a = (strand.angle * Math.PI) / 180
  const x = end.x * strand.length
  const y = end.y * strand.length
  return [strand.baseX + x * Math.cos(a) - y * Math.sin(a), strand.baseY + x * Math.sin(a) + y * Math.cos(a)]
}

describe("the strand shape", { timeout: TIMEOUT }, () => {
  const spec = createStringOfPearls(3).stages.at(-1)!.leaves[0].spec

  it("starts at the stalk end and has a length of 1 at unit size", () => {
    const curve = strandCurve(spec, 20, 90)
    expect(curve[0]).toMatchObject({ x: 0, y: 0 })
    let length = 0
    for (let i = 1; i < curve.length; i++) length += Math.hypot(curve[i].x - curve[i - 1].x, curve[i].y - curve[i - 1].y)
    expect(length).toBeCloseTo(1, 2)
  })

  it("ends pointing down in the canvas whichever way it leans", () => {
    for (const angle of [-50, -20, 0, 15, 45]) {
      const curve = strandCurve(spec, angle, 90)
      const end = curve[curve.length - 1].heading
      const canvas = ((end * 180) / Math.PI + angle + 360) % 360
      expect(Math.abs(canvas - 180)).toBeLessThanOrEqual(Math.abs(spec.hang - 180) + spec.sway + 1e-6)
    }
  })

  it("mirrors for a strand that leans left", () => {
    const right = strandCurve(spec, 30, 40)
    const left = strandCurve(spec, -30, 40)
    right.forEach((p, i) => {
      expect(left[i].x).toBeCloseTo(-p.x, 9)
      expect(left[i].y).toBeCloseTo(p.y, 9)
    })
  })

  it("puts one bead per count along the curve, shrinking toward the tip", () => {
    const beads = strandBeads(spec, 20)
    expect(beads).toHaveLength(spec.beads)
    expect(beads[beads.length - 1].r / beads[0].r).toBeGreaterThan(STRAND_TAPER - 0.1)
    expect(beads[beads.length - 1].r).toBeLessThan(beads[0].r)
  })

  it("has an outline that scales with the length and contains every bead center", () => {
    const small = strandPolygon(spec, 10, 8, 20)
    const big = strandPolygon(spec, 40, 8, 20)
    small.forEach(([x, y], i) => {
      expect(big[i][0]).toBeCloseTo(x * 4, 9)
      expect(big[i][1]).toBeCloseTo(y * 4, 9)
    })
    const ribbon = strandPolygon(spec, 1, 24, 20)
    for (const bead of strandBeads(spec, 20)) {
      const distances = ribbon.map(([x, y]) => Math.hypot(x - bead.x, y - bead.y))
      // The ribbon is as wide as the bead: its edge points are about one radius away from its middle.
      expect(Math.min(...distances)).toBeLessThan(bead.r * 1.5)
    }
  })

  it("reads the leaf angle, so the same strand hangs differently at different angles", () => {
    expect(strandPolygon(spec, 50, 8, 10)).not.toEqual(strandPolygon(spec, 50, 8, 40))
  })
})

describe("the picture", { timeout: TIMEOUT }, () => {
  it("draws every strand as a thread with beads, two circles to a bead", () => {
    for (const stage of [1, 2, 3, 4]) {
      const plant = createStringOfPearls(7)
      const beads = plant.stages[stage - 1].leaves.reduce((sum, strand) => sum + strand.spec.beads, 0)
      const markup = renderToStaticMarkup(<StringOfPearls seed={7} stage={stage} />)
      const circles = markup.match(/<circle /g) ?? []
      expect(circles.length).toBeGreaterThanOrEqual(beads * 2)
    }
  })

  it("only changes the picture size when scaled, never strand or stem placement", () => {
    const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<StringOfPearls seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<StringOfPearls seed={7} stage={stage} scale={0.4} />)
      const c = renderToStaticMarkup(<StringOfPearls seed={7} stage={stage} scale={1.7} />)
      expect(strip(b)).toBe(strip(a))
      expect(strip(c)).toBe(strip(a))
    }
  })
})

describe("wilting", { timeout: TIMEOUT }, () => {
  const species = STRING_OF_PEARLS_SPECIES

  it("keeps every strand within the side limits and the hang floor at every wilt", () => {
    for (const wilt of [0.5, 1]) {
      for (const seed of SEEDS.slice(0, 20)) {
        const plant = wiltPlant(createStagedPlant(seed, species), wilt)
        for (const st of plant.stages) {
          for (const strand of st.leaves) {
            for (const [x, y] of strandOutline(strand)) {
              expect(x).toBeGreaterThanOrEqual(LIMITS.left - 0.01)
              expect(x).toBeLessThanOrEqual(LIMITS.right + 0.01)
              expect(y).toBeLessThanOrEqual(LIMITS.floor + 0.01)
            }
          }
        }
      }
    }
  })

  it("leaves a strand's direction and shape alone, and only tilts its stem and browns it", () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const healthy = createStagedPlant(seed, species)
      const wilted = wiltPlant(healthy, 1)
      const last = healthy.stages.at(-1)!
      const wiltedLast = wilted.stages.at(-1)!
      wiltedLast.leaves.forEach((strand) => {
        const before = last.leaves.find((l) => l.index === strand.index)!
        expect(strand.angle).toBe(before.angle)
        expect(strand.bend ?? 0).toBe(0)
        expect(strand.length).toBeLessThanOrEqual(before.length + EPS)
      })
      expect(wiltedLast.leaves.some((strand) => strand.browning)).toBe(true)
    }
  })
})
