import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { flowerLook } from "./flowers"
import { OpeningHead } from "./OpeningHead"
import { FLOWER_CONFIG } from "./peaceLilyConfig"

// Flowers are buds from stage 3 and in bloom from stage 4.
describe("flowerLook", () => {
  it("is none, a bud or a full bloom at rest", () => {
    expect(flowerLook(2, null, FLOWER_CONFIG)).toBeNull()
    expect(flowerLook(3, null, FLOWER_CONFIG)).toEqual({ size: 1, open: 0 })
    expect(flowerLook(4, null, FLOWER_CONFIG)).toEqual({ size: 1, open: 1 })
  })

  it("opens a bud gradually when the plant moves from stage 3 to 4, instead of popping open", () => {
    const opens = [0, 0.25, 0.5, 0.75, 1].map((t) => flowerLook(4, { from: 3, to: 4, t }, FLOWER_CONFIG)?.open ?? -1)
    expect(opens[0]).toBe(0)
    expect(opens[4]).toBe(1)
    for (let i = 1; i < opens.length; i++) expect(opens[i]).toBeGreaterThan(opens[i - 1])
    expect(flowerLook(4, { from: 3, to: 4, t: 0.5 }, FLOWER_CONFIG)?.size).toBe(1)
  })

  it("grows buds from nothing, then opens them, when a plant goes from no flowers straight to blooming", () => {
    const at = (t: number) => flowerLook(4, { from: 0, to: 4, t }, FLOWER_CONFIG)
    expect(at(0)).toBeNull()
    // Early on: a small, closed bud.
    expect(at(0.25)?.open).toBe(0)
    expect(at(0.25)?.size).toBeGreaterThan(0)
    expect(at(0.25)?.size).toBeLessThan(1)
    // Half way: full size, still closed. Then it opens.
    expect(at(0.5)).toEqual({ size: 1, open: 0 })
    expect(at(0.75)?.open).toBeGreaterThan(0)
    expect(at(0.75)?.open).toBeLessThan(1)
    expect(at(1)).toEqual({ size: 1, open: 1 })
  })

  it("grows a new bud from nothing when a plant goes from stage 2 to 3", () => {
    expect(flowerLook(3, { from: 2, to: 3, t: 0 }, FLOWER_CONFIG)).toBeNull()
    const half = flowerLook(3, { from: 2, to: 3, t: 0.5 }, FLOWER_CONFIG)
    expect(half?.open).toBe(0)
    expect(half?.size).toBeGreaterThan(0)
    expect(half?.size).toBeLessThan(1)
  })

  it("shows nothing while a plant has no flowers at either end of the move", () => {
    expect(flowerLook(2, { from: 1, to: 2, t: 0.5 }, FLOWER_CONFIG)).toBeNull()
  })
})

describe("OpeningHead", () => {
  const draw = (open: number) => renderToStaticMarkup(<svg><OpeningHead open={open} pivotY={-20} bud={<circle id="bud" />} bloom={<rect id="bloom" />} /></svg>)

  it("draws only the bud when closed and only the bloom when open, as before", () => {
    expect(draw(0)).toContain('id="bud"')
    expect(draw(0)).not.toContain('id="bloom"')
    expect(draw(1)).toContain('id="bloom"')
    expect(draw(1)).not.toContain('id="bud"')
  })

  it("draws both while it opens", () => {
    expect(draw(0.5)).toContain('id="bud"')
    expect(draw(0.5)).toContain('id="bloom"')
  })
})
