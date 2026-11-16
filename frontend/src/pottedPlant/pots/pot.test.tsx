import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SOIL } from "../genome"
import { mulberry32 } from "../rng"
import { pathPoints } from "./pathPoints"
import {
  POT_BANDS,
  POT_BAND_ODDS,
  POT_FINISH_IDS,
  POT_PALETTES,
  POT_RIM,
  POT_SHAPE,
  POT_SOIL,
  Pot,
  pickPotBand,
  potLookFromSeed,
  type PotLook,
} from "./index"

const lookOf = (band: PotLook["band"], palette = 0): PotLook => ({ palette, band, finish: "solid", seed: 1 })

const render = (band: PotLook["band"], size = 1, palette = 0) =>
  renderToStaticMarkup(
    <svg>
      <Pot look={lookOf(band, palette)} size={size} id="t" />
    </svg>,
  )

describe("pot shape", () => {
  it("puts the rim where plants expect it", () => {
    expect(POT_RIM.right - POT_RIM.left).toBe(POT_SHAPE.rim.width)
    expect(POT_RIM.left).toBe(POT_SHAPE.rim.x)
  })

  it("makes the plants' soil point the center of the pot's soil", () => {
    expect(POT_SOIL).toEqual({ x: POT_SHAPE.soil.cx, y: POT_SHAPE.soil.cy })
    expect(SOIL).toEqual(POT_SOIL)
  })
})

describe("the rim's outline", () => {
  const { rim } = POT_SHAPE
  const points = pathPoints(rim.path, 1000)
  /** The lowest point of the rim: the bottom of its box. */
  const bottom = rim.y + rim.height

  it("fills the rim's box, so plants find its left and right edges where they expect", () => {
    const xs = points.map(([px]) => px)
    const ys = points.map(([, py]) => py)
    expect(Math.min(...xs)).toBeCloseTo(rim.x, 1)
    expect(Math.max(...xs)).toBeCloseTo(rim.x + rim.width, 1)
    expect(Math.min(...ys)).toBeCloseTo(rim.y, 1)
    expect(Math.max(...ys)).toBeCloseTo(bottom, 1)
    expect(Math.min(...xs)).toBeCloseTo(POT_RIM.left, 1)
    expect(Math.max(...xs)).toBeCloseTo(POT_RIM.right, 1)
  })

  it("has a base that is lowest in the middle and curves up toward the sides", () => {
    const middle = rim.x + rim.width / 2
    const lowAt = (px: number) => Math.max(...points.filter(([x, y]) => Math.abs(x - px) < 0.6 && y > rim.y + rim.height / 2).map(([, y]) => y))
    expect(lowAt(middle)).toBeCloseTo(bottom, 1)
    expect(lowAt(middle)).toBeGreaterThan(lowAt(rim.x + rim.width - rim.baseCorner - 2) + 1)
    expect(lowAt(rim.x + rim.width - rim.baseCorner - 2)).toBeCloseTo(lowAt(rim.x + rim.baseCorner + 2), 1)
  })

  it("never turns sharply: its direction changes smoothly all the way around", () => {
    const direction = (a: [number, number], b: [number, number]) => Math.atan2(b[1] - a[1], b[0] - a[0])
    const steps = points.slice(1).filter((p, i) => p[0] !== points[i][0] || p[1] !== points[i][1])
    let sharpest = 0
    for (let i = 1; i < steps.length - 1; i++) {
      const before = direction(steps[i - 1], steps[i])
      const after = direction(steps[i], steps[i + 1])
      let turn = Math.abs(after - before)
      if (turn > Math.PI) turn = 2 * Math.PI - turn
      sharpest = Math.max(sharpest, turn)
    }
    // Under 1 degree between neighbouring samples (1000 per curve). An earlier
    // version with a sharp join turned 1.4 degrees; this one turns well under 0.5.
    expect(sharpest).toBeLessThan((1 * Math.PI) / 180)
  })
})

describe("potLookFromSeed", () => {
  it("is deterministic and picks a real palette, band, finish and pattern seed", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const look = potLookFromSeed(seed)
      expect(look).toEqual(potLookFromSeed(seed))
      expect(Number.isInteger(look.palette)).toBe(true)
      expect(look.palette).toBeGreaterThanOrEqual(0)
      expect(look.palette).toBeLessThan(POT_PALETTES.length)
      expect(POT_BANDS).toContain(look.band)
      expect(POT_FINISH_IDS).toContain(look.finish)
      expect(Number.isInteger(look.seed)).toBe(true)
    }
  })

  it("uses every palette and band across seeds", () => {
    const palettes = new Set<number>()
    const bands = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) {
      const look = potLookFromSeed(seed)
      palettes.add(look.palette)
      bands.add(look.band)
    }
    expect(palettes.size).toBe(POT_PALETTES.length)
    expect(bands.size).toBe(POT_BANDS.length)
  })

  it("gives different seeds different looks", () => {
    const looks = new Set<string>()
    for (let seed = 1; seed <= 50; seed++) looks.add(JSON.stringify(potLookFromSeed(seed)))
    expect(looks.size).toBe(50)
  })

  it("follows the band odds, so the stripe is more common than none", () => {
    let stripes = 0
    const seeds = 3000
    for (let seed = 1; seed <= seeds; seed++) if (potLookFromSeed(seed).band === "stripe") stripes++
    const expected = POT_BAND_ODDS.stripe / (POT_BAND_ODDS.stripe + POT_BAND_ODDS.none)
    expect(Math.abs(stripes / seeds - expected)).toBeLessThan(0.04)
  })

  it("draws from its own stream, not the plant's", () => {
    // The plant's stream is mulberry32(seed). A pot made from the same seed must not follow it:
    // matching the plant's first draw by chance is about one palette in five, not most of them.
    const matches = Array.from({ length: 200 }, (_, i) => i + 1).filter(
      (seed) => potLookFromSeed(seed).palette === Math.floor(mulberry32(seed)() * POT_PALETTES.length),
    )
    expect(matches.length).toBeLessThan(100)
  })
})

describe("pickPotBand", () => {
  it("follows the odds it is given by the band table", () => {
    let stripes = 0
    const draws = 3000
    for (let seed = 1; seed <= draws; seed++) if (pickPotBand(mulberry32(seed)) === "stripe") stripes++
    const expected = POT_BAND_ODDS.stripe / (POT_BAND_ODDS.stripe + POT_BAND_ODDS.none)
    expect(Math.abs(stripes / draws - expected)).toBeLessThan(0.04)
  })
})

describe("Pot", () => {
  it("draws every band with every palette", () => {
    for (const band of POT_BANDS) {
      for (let palette = 0; palette < POT_PALETTES.length; palette++) {
        expect(render(band, 1, palette)).toContain(POT_PALETTES[palette].body)
      }
    }
  })

  it("wraps a palette index past the end", () => {
    expect(render("none", 1, POT_PALETTES.length)).toBe(render("none", 1, 0))
  })

  it("draws no dots on any band", () => {
    expect(POT_BANDS).toEqual(["none", "stripe"])
    for (const band of POT_BANDS) {
      for (const size of [0.6, 1, 1.6]) expect(render(band, size)).not.toContain("<circle")
    }
  })

  it("draws one stripe for the stripe band and none for the plain band", () => {
    const plain = render("none")
    expect(plain.match(/<rect/g)?.length).toBe(render("stripe").match(/<rect/g)!.length - 1)
  })

  it("keeps the pot's shape the same at every size", () => {
    const body = (size: number) => render("stripe", size).match(/<path d="[^"]*"/g)
    expect(body(0.6)).toEqual(body(1.6))
  })

  it("draws the same markup every time for the same look", () => {
    for (const seed of [1, 2, 99]) {
      const look = potLookFromSeed(seed)
      const draw = () => renderToStaticMarkup(<svg><Pot look={look} id="t" /></svg>)
      expect(draw()).toBe(draw())
    }
  })
})
