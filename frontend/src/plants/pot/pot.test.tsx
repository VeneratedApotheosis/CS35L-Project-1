import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SOIL } from "../genome"
import { mulberry32 } from "../rng"
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
