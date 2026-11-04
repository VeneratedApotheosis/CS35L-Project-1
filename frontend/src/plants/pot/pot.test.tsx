import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SOIL } from "../genome"
import { mulberry32 } from "../rng"
import { POT_BANDS, POT_PALETTES, POT_RIM, POT_SHAPE, POT_SOIL, Pot, pickPotStyle } from "./index"

const render = (band: (typeof POT_BANDS)[number], size = 1, palette = 0) =>
  renderToStaticMarkup(
    <svg>
      <Pot palette={palette} band={band} size={size} id="t" />
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

describe("pickPotStyle", () => {
  it("is deterministic and picks a real palette and band", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const a = pickPotStyle(mulberry32(seed))
      expect(a).toEqual(pickPotStyle(mulberry32(seed)))
      expect(a.pot).toBeGreaterThanOrEqual(0)
      expect(a.pot).toBeLessThan(POT_PALETTES.length)
      expect(POT_BANDS).toContain(a.band)
    }
  })

  it("uses every palette and band across seeds", () => {
    const pots = new Set<number>()
    const bands = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) {
      const s = pickPotStyle(mulberry32(seed))
      pots.add(s.pot)
      bands.add(s.band)
    }
    expect(pots.size).toBe(POT_PALETTES.length)
    expect(bands.size).toBe(POT_BANDS.length)
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

  it("draws fewer, bigger dots as size grows", () => {
    const circles = (size: number) => (render("dots", size).match(/<circle/g) ?? []).length
    expect(circles(0.6)).toBeGreaterThan(circles(1))
    expect(circles(1)).toBeGreaterThan(circles(1.6))
    expect(circles(1.6)).toBeGreaterThanOrEqual(POT_SHAPE.dots.minCount)
  })

  it("draws no stripe or dots for the plain band", () => {
    const plain = render("none")
    expect(plain).not.toContain("<circle")
    expect(plain.match(/<rect/g)?.length).toBe(render("stripe").match(/<rect/g)!.length - 1)
  })

  it("keeps the pot's shape the same at every size", () => {
    const body = (size: number) => render("stripe", size).match(/<path d="[^"]*"/g)
    expect(body(0.6)).toEqual(body(1.6))
  })
})
