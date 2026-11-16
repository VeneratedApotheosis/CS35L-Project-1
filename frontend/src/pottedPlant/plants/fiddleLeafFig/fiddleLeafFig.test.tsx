import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { VIEWBOX } from "../../genome"
import { WiltProvider } from "../staged/WiltContext"
import { wiltPlant } from "../staged/wilt"
import { KIMBERLY_QUEEN_CONFIG } from "../kimberlyQueen/kimberlyQueenConfig"
import { MONSTERA_CONFIG } from "../monstera/monsteraConfig"
import { PEACE_LILY_CONFIG } from "../peaceLily/peaceLilyConfig"
import { PHILODENDRON_CONFIG } from "../philodendron/philodendronConfig"
import { PILEA_CONFIG } from "../pilea/pileaConfig"
import { POTHOS_CONFIG } from "../pothos/pothosConfig"
import { SNAKE_PLANT_CONFIG } from "../snakePlant/snakePlantConfig"
import { FiddleLeafFig, FiddleLeafFigDrawing } from "./FiddleLeafFig"
import { FIDDLE_LEAF_FIG_CONFIG } from "./fiddleLeafFigConfig"
import { bladeWidth, FIDDLE_PROFILE, fiddleLeafPath, fiddleLeafPolygon, randomFiddleLeaf } from "./fiddleLeafFigLeaf"
import { fiddleTrunk } from "./fiddleLeafFigTrunk"
import { createFiddleLeafFig, leafOutline, stageLeafCounts, stageScales } from "./fiddleLeafFigStages"
import { mulberry32 } from "../../rng"

// Growing 60 plants of up to 14 leaves is slow when the whole suite runs at once.
vi.setConfig({ testTimeout: 30000 })

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const EPS = 1e-6
const CONFIG = FIDDLE_LEAF_FIG_CONFIG
const LIMITS = CONFIG.limits
const ANCHOR = CONFIG.dome.anchor

describe("stage ladder", () => {
  it("gives 4 to 14 leaves (4, 6, 10, 14) and never exceeds the leaf cap", () => {
    expect(stageLeafCounts(4)).toEqual([4, 6, 10, 14])
    for (let s = 1; s <= CONFIG.stages.max; s++) {
      for (const n of stageLeafCounts(s)) expect(n).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
    }
  })

  it("scales the last stage to 1", () => {
    expect(stageScales(4).at(-1)).toBe(1)
  })
})

describe("the tallest plant", () => {
  it("has a taller or equal dome than every other plant, and fits the frame", () => {
    const others = [
      KIMBERLY_QUEEN_CONFIG, MONSTERA_CONFIG, PEACE_LILY_CONFIG, PHILODENDRON_CONFIG,
      PILEA_CONFIG, POTHOS_CONFIG, SNAKE_PLANT_CONFIG,
    ]
    for (const other of others) expect(CONFIG.dome.height, other.name).toBeGreaterThanOrEqual(other.dome.height)
    const frameTop = Number(VIEWBOX.split(" ")[1])
    expect(ANCHOR.y - CONFIG.dome.height).toBeGreaterThanOrEqual(frameTop)
  })

  it("uses its own random stream", () => {
    expect(CONFIG.rngStreams.leaf).toBe(233)
  })
})

describe("generated fiddle-leaf fig", () => {
  it("is deterministic", () => {
    expect(createFiddleLeafFig(7)).toEqual(createFiddleLeafFig(7))
  })

  it("builds exactly the requested number of stages and renders", () => {
    for (const stages of [1, 3, 4, 6]) {
      expect(createFiddleLeafFig(7, { stages }).stages).toHaveLength(stages)
    }
    expect(renderToStaticMarkup(<FiddleLeafFig seed={7} stage={4} />)).toContain("<svg")
  })

  it("never draws more than the configured leaf cap, and has 14 leaves at the last stage", () => {
    for (const seed of SEEDS) {
      const { stages } = createFiddleLeafFig(seed)
      for (const st of stages) expect(st.leaves.length).toBeLessThanOrEqual(CONFIG.stages.maxLeaves)
      expect(stages.at(-1)!.leaves).toHaveLength(14)
    }
  })

  it("makes the last stage at least 3.6 times the first, with longer leaves", () => {
    for (const seed of SEEDS) {
      const { stages } = createFiddleLeafFig(seed)
      const first = stages[0]
      const last = stages[stages.length - 1]
      expect(last.halfWidth / first.halfWidth).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.height / first.height).toBeGreaterThanOrEqual(CONFIG.stages.growthRatio - 0.01)
      expect(last.leafLength).toBeGreaterThan(first.leafLength * 1.3)
    }
  })

  it("grows evenly in every direction", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { stages } = createFiddleLeafFig(seed)
      const aspect = stages[0].height / stages[0].halfWidth
      for (const st of stages) expect(st.height / st.halfWidth).toBeCloseTo(aspect, 9)
    }
  })

  it("scales leaves and positions with the rest of the plant", () => {
    const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)
    for (const seed of SEEDS) {
      const { stages } = createFiddleLeafFig(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          const full = last.leaves.find((l) => l.index === leaf.index)!
          close(leaf.length / st.scale, full.length)
          close((leaf.baseX - ANCHOR.x) / st.scale, full.baseX - ANCHOR.x)
          close((ANCHOR.y - leaf.baseY) / st.scale, ANCHOR.y - full.baseY)
          close(leaf.angle, full.angle)
        }
      }
    }
  })

  it("keeps every leaf above the soil, within the side limits and under the top of the frame", () => {
    const frameTop = Number(VIEWBOX.split(" ")[1])
    for (const seed of SEEDS) {
      for (const st of createFiddleLeafFig(seed).stages) {
        for (const leaf of st.leaves) {
          for (const [x, y] of leafOutline(leaf)) {
            expect(x).toBeGreaterThanOrEqual(LIMITS.left - EPS)
            expect(x).toBeLessThanOrEqual(LIMITS.right + EPS)
            expect(y).toBeLessThanOrEqual(LIMITS.floor + EPS)
            expect(y).toBeGreaterThanOrEqual(frameTop - EPS)
          }
        }
      }
    }
  })

  it("fills the canopy it encloses", () => {
    for (const seed of SEEDS) {
      for (const st of createFiddleLeafFig(seed).stages) expect(st.coverage).toBeGreaterThanOrEqual(0.1)
      expect(createFiddleLeafFig(seed).stages.at(-1)!.coverage).toBeGreaterThanOrEqual(0.25)
    }
  })

  it("roots every stem in the middle of the pot, near one trunk", () => {
    const width = CONFIG.pot.rimRight - CONFIG.pot.rimLeft
    const [lo, hi] = CONFIG.roots.range
    for (const seed of SEEDS) {
      for (const st of createFiddleLeafFig(seed).stages) {
        for (const leaf of st.leaves) {
          expect(leaf.stem.x0).toBeGreaterThanOrEqual(CONFIG.pot.rimLeft + width * lo - EPS)
          expect(leaf.stem.x0).toBeLessThanOrEqual(CONFIG.pot.rimLeft + width * hi + EPS)
        }
      }
    }
  })

  it("keeps each leaf's identity and shape across stages", () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const { stages } = createFiddleLeafFig(seed)
      const last = stages[stages.length - 1]
      for (const st of stages) {
        for (const leaf of st.leaves) {
          expect(last.leaves.find((l) => l.index === leaf.index)?.spec).toEqual(leaf.spec)
        }
      }
    }
  })
})

describe("the layered crown", () => {
  it("sets the crown angles in the config: out and slightly down at the bottom, upright at the top", () => {
    const { outward, upright } = FIDDLE_LEAF_FIG_CONFIG.layerAngle!
    expect(outward).toBeGreaterThan(90)
    expect(upright).toBeLessThan(30)
  })

  it("points the lower leaves outward and the higher leaves upright", () => {
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
    for (const seed of SEEDS) {
      const last = createFiddleLeafFig(seed).stages.at(-1)!
      const byHeight = [...last.leaves].sort((a, b) => b.baseY - a.baseY)
      const third = Math.floor(byHeight.length / 3)
      const lowAngle = mean(byHeight.slice(0, third).map((l) => Math.abs(l.angle)))
      const highAngle = mean(byHeight.slice(-third).map((l) => Math.abs(l.angle)))
      expect(lowAngle).toBeGreaterThan(60)
      expect(highAngle).toBeLessThan(45)
      expect(lowAngle - highAngle).toBeGreaterThan(25)
    }
  })

  it("keeps the leaves of the full plant on both sides of the trunk", () => {
    for (const seed of SEEDS) {
      const last = createFiddleLeafFig(seed).stages.at(-1)!
      expect(last.leaves.filter((l) => l.angle < 0).length).toBeGreaterThanOrEqual(3)
      expect(last.leaves.filter((l) => l.angle > 0).length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe("the violin leaf", () => {
  const leaves = Array.from({ length: 40 }, (_, i) => randomFiddleLeaf(mulberry32(i + 1)))

  it("is broad at the tip, pinches at a waist and widens again near the base", () => {
    for (const spec of leaves) {
      const waist = bladeWidth(spec, FIDDLE_PROFILE.waist)
      expect(bladeWidth(spec, FIDDLE_PROFILE.lobePeak)).toBeGreaterThan(waist + 0.04)
      expect(bladeWidth(spec, FIDDLE_PROFILE.broadest)).toBeGreaterThan(waist + 0.3)
      expect(bladeWidth(spec, FIDDLE_PROFILE.broadest)).toBeGreaterThan(bladeWidth(spec, FIDDLE_PROFILE.lobePeak))
    }
  })

  it("has an outline that starts at the stalk end and ends at the tip", () => {
    for (const spec of leaves) {
      const outline = fiddleLeafPolygon(spec, 40)
      expect(outline[0]).toEqual([0, 0])
      expect(outline.some(([x, y]) => x === 0 && y === -40)).toBe(true)
    }
  })

  it("is drawn with exactly the polygon the engine fits", () => {
    const spec = leaves[0]
    const fitted = fiddleLeafPolygon(spec, 40, CONFIG.search.fitSegments)
    const drawn = fiddleLeafPath(spec, 40)
    expect(drawn.split(" L")).toHaveLength(fitted.length)
  })
})

describe("the trunk", () => {
  it("is drawn behind the leaves, as one trunk with a branch for every leaf", () => {
    const html = renderToStaticMarkup(<FiddleLeafFig seed={7} stage={4} />)
    const trunk = html.indexOf('data-trunk="true"')
    expect(trunk).toBeGreaterThan(-1)
    expect(html.indexOf("clipPath", trunk)).toBeGreaterThan(trunk)
    const last = createFiddleLeafFig(7).stages.at(-1)!
    expect(fiddleTrunk(last, ANCHOR)!.branches).toHaveLength(last.leaves.length)
  })

  it("rises from the soil to just under the highest leaf, with a short bare stretch at the bottom", () => {
    for (const seed of SEEDS) {
      const last = createFiddleLeafFig(seed).stages.at(-1)!
      const lowest = Math.max(...last.leaves.map((l) => l.baseY))
      const highest = Math.min(...last.leaves.map((l) => l.baseY))
      expect(ANCHOR.y - lowest).toBeGreaterThanOrEqual(last.height * 0.1)
      expect(ANCHOR.y - highest).toBeGreaterThanOrEqual(last.height * 0.4)
    }
  })

  it("carries several leaves low on the trunk, so it is not bare", () => {
    for (const seed of SEEDS) {
      const last = createFiddleLeafFig(seed).stages.at(-1)!
      const low = last.leaves.filter((l) => ANCHOR.y - l.baseY <= last.height * 0.4)
      expect(low.length).toBeGreaterThanOrEqual(4)
    }
  })

  it("ends every branch heading the way its leaf points, so the leaf stays attached", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const last = createFiddleLeafFig(seed).stages.at(-1)!
      const trunk = fiddleTrunk(last, ANCHOR)!
      for (const leaf of last.leaves) {
        const d = trunk.branches.find((b) => b.index === leaf.index)!.d
        const [, cx, cy, bx, by] = d.match(/Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)$/)!.map(Number)
        expect(bx).toBeCloseTo(leaf.baseX, 1)
        expect(by).toBeCloseTo(leaf.baseY, 1)
        const a = (leaf.angle * Math.PI) / 180
        const cross = (bx - cx) * -Math.cos(a) - (by - cy) * Math.sin(a)
        expect(Math.abs(cross)).toBeLessThan(0.05)
      }
    }
  })

  it("is not drawn for a stage with no leaves", () => {
    const first = createFiddleLeafFig(7).stages[0]
    expect(fiddleTrunk({ ...first, leaves: [] }, ANCHOR)).toBeNull()
  })

  it("has no flowers and the bare drawing has no pot", () => {
    const html = renderToStaticMarkup(<FiddleLeafFig seed={7} stage={4} />)
    expect(html).not.toContain("data-flower")
    expect(renderToStaticMarkup(<FiddleLeafFigDrawing seed={7} />)).not.toContain("<svg")
  })
})

describe("wilting", () => {
  it("keeps every wilted leaf inside the limits and still draws a trunk", () => {
    for (const seed of SEEDS.slice(0, 10)) {
      for (const wilt of [0.5, 1]) {
        const plant = wiltPlant(createFiddleLeafFig(seed), wilt)
        for (const st of plant.stages) {
          for (const leaf of st.leaves) {
            for (const [x, y] of leafOutline(leaf)) {
              expect(x).toBeGreaterThanOrEqual(LIMITS.left - EPS)
              expect(x).toBeLessThanOrEqual(LIMITS.right + EPS)
              expect(y).toBeLessThanOrEqual(LIMITS.floor + EPS)
            }
          }
        }
      }
    }
    const html = renderToStaticMarkup(
      <WiltProvider wilt={1}>
        <FiddleLeafFig seed={7} stage={4} />
      </WiltProvider>,
    )
    expect(html).toContain('data-trunk="true"')
  })
})

describe("scale", () => {
  const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")

  it("only changes the picture size, never leaf or trunk placement", () => {
    for (const stage of [1, 2, 3, 4]) {
      const a = renderToStaticMarkup(<FiddleLeafFig seed={7} stage={stage} />)
      const b = renderToStaticMarkup(<FiddleLeafFig seed={7} stage={stage} scale={0.4} />)
      const c = renderToStaticMarkup(<FiddleLeafFig seed={7} stage={stage} scale={1.7} />)
      expect(strip(b)).toBe(strip(a))
      expect(strip(c)).toBe(strip(a))
    }
  })
})
