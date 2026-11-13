import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ACCENTS, accentCount, accentFrame, makeAccents, type AccentArea } from "./accents"
import { GrowthAccents } from "./GrowthAccents"

const area = (scale: number): AccentArea => ({ x: 100, y: 190, halfWidth: 56 * scale, height: 100 * scale })
const kinds = (seed: number, stage: number, scale: number, last: boolean) => {
  const accents = makeAccents(seed, stage, scale, area(scale), last)
  const count = (kind: string) => accents.filter((accent) => accent.kind === kind).length
  return { accents, line: count("line"), pop: count("pop"), star: count("star") }
}

describe("stage-up accents", () => {
  it("has lines and pops on every stage, and stars only on the last", () => {
    for (const [stage, scale] of [[2, 0.4], [3, 0.65]] as const) {
      const made = kinds(7, stage, scale, false)
      expect(made.line).toBeGreaterThan(0)
      expect(made.pop).toBeGreaterThan(0)
      expect(made.star).toBe(0)
    }
    const last = kinds(7, 4, 1, true)
    expect(last.line).toBeGreaterThan(0)
    expect(last.pop).toBeGreaterThan(0)
    expect(last.star).toBeGreaterThan(0)
  })

  it("makes more accents, and larger ones, for a bigger plant", () => {
    const small = kinds(7, 2, 0.3, false)
    const large = kinds(7, 3, 0.9, false)
    expect(large.line).toBeGreaterThan(small.line)
    expect(large.pop).toBeGreaterThan(small.pop)
    const meanSize = (accents: { kind: string; size: number }[], kind: string) => {
      const sizes = accents.filter((accent) => accent.kind === kind).map((accent) => accent.size)
      return sizes.reduce((sum, size) => sum + size, 0) / sizes.length
    }
    expect(meanSize(large.accents, "pop")).toBeGreaterThan(meanSize(small.accents, "pop") * 2)
    expect(accentCount("star", 1)).toBe(ACCENTS.max)
    expect(accentCount("star", 0)).toBe(ACCENTS.fewest.stars)
  })

  it("never makes more than the maximum of any kind, which is 10", () => {
    expect(ACCENTS.max).toBe(10)
    for (const scale of [0, 0.3, 0.7, 1, 3]) {
      const made = kinds(7, 4, scale, true)
      expect(Math.max(made.line, made.pop, made.star)).toBeLessThanOrEqual(10)
    }
    expect(kinds(7, 4, 1, true).line).toBe(10)
  })

  it("spreads the accents over the whole half-oval, from the left side over the top to the right", () => {
    const full = area(1)
    for (const kind of ["line", "pop", "star"] as const) {
      const angles = makeAccents(7, 4, 1, full, true).filter((accent) => accent.kind === kind).map((accent) => accent.angle)
      expect(Math.min(...angles)).toBeLessThan(Math.PI * 0.2)
      expect(Math.max(...angles)).toBeGreaterThan(Math.PI * 0.8)
      const sorted = [...angles].sort((a, b) => a - b)
      for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeLessThan(Math.PI * 0.4)
    }
  })

  it("is the same for the same plant and stage, and different for another seed", () => {
    expect(makeAccents(7, 3, 0.6, area(0.6), false)).toEqual(makeAccents(7, 3, 0.6, area(0.6), false))
    expect(makeAccents(8, 3, 0.6, area(0.6), false)).not.toEqual(makeAccents(7, 3, 0.6, area(0.6), false))
  })

  it("keeps every accent above the soil, and only shows it during its own moment", () => {
    const big = area(1)
    for (const accent of makeAccents(3, 4, 1, big, true)) {
      let shown = 0
      for (let time = 0; time <= 1; time += 0.02) {
        const frame = accentFrame(accent, big, time)
        if (!frame) continue
        shown++
        expect(frame.y).toBeLessThan(big.y)
        expect(frame.opacity).toBeGreaterThanOrEqual(0)
        expect(frame.opacity).toBeLessThanOrEqual(1)
      }
      expect(shown).toBeGreaterThan(0)
      expect(accentFrame(accent, big, 1)).toBeNull()
    }
  })

  it("draws shapes while it runs, stars only on the last stage, and nothing at the end", () => {
    const last = makeAccents(5, 4, 1, area(1), true)
    const middle = renderToStaticMarkup(<svg><GrowthAccents accents={last} area={area(1)} time={0.4} /></svg>)
    expect(middle).toContain("<line")
    expect(middle).toContain("<circle")
    expect(middle).toContain("<path")
    const early = makeAccents(5, 2, 0.4, area(0.4), false)
    const earlyMarkup = renderToStaticMarkup(<svg><GrowthAccents accents={early} area={area(0.4)} time={0.4} /></svg>)
    expect(earlyMarkup).not.toContain("<path")
    expect(renderToStaticMarkup(<svg><GrowthAccents accents={last} area={area(1)} time={1} /></svg>)).not.toContain("<line")
  })
})
