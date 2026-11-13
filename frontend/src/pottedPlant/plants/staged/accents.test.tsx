import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ACCENTS, ACCENTS_END, accentCount, accentFrame, accentRing, makeAccents, type AccentArea } from "./accents"
import { GrowthAccents } from "./GrowthAccents"

const area = (scale: number): AccentArea => ({ x: 100, y: 190, halfWidth: 56 * scale, height: 100 * scale, scale })
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
    expect(accentCount("star", 1)).toBe(ACCENTS.max.stars)
    expect(accentCount("star", 0)).toBe(ACCENTS.fewest.stars)
  })

  it("never makes more than the maximum of any kind: 5 lines, 3 pops and 2 stars", () => {
    expect(ACCENTS.max).toEqual({ lines: 5, pops: 3, stars: 2 })
    for (const scale of [0, 0.3, 0.7, 1, 3]) {
      const made = kinds(7, 4, scale, true)
      expect(made.line).toBeLessThanOrEqual(5)
      expect(made.pop).toBeLessThanOrEqual(3)
      expect(made.star).toBeLessThanOrEqual(2)
    }
    const full = kinds(7, 4, 1, true)
    expect([full.line, full.pop, full.star]).toEqual([5, 3, 2])
  })

  it("spreads each kind over the whole half-oval, from the left side over the top to the right", () => {
    const full = area(1)
    for (const kind of ["line", "pop", "star"] as const) {
      const angles = makeAccents(7, 4, 1, full, true).filter((accent) => accent.kind === kind).map((accent) => accent.angle)
      const sorted = [0, ...[...angles].sort((a, b) => a - b), Math.PI]
      // No stretch of the half-oval, from either end, is left much emptier than an even spread would leave it.
      for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeLessThan((Math.PI * 1.8) / angles.length)
    }
  })

  it("balances the accents of every stage between the left and right sides", () => {
    const left = (angle: number) => angle > Math.PI / 2
    for (const [stage, scale] of [[2, 0.28], [3, 0.5], [4, 1]] as const) {
      for (const seed of [1, 2, 3, 7, 11, 42, 99]) {
        const full = area(scale)
        const accents = makeAccents(seed, stage, scale, full, stage === 4)
        for (const kind of ["line", "pop", "star"] as const) {
          const angles = accents.filter((accent) => accent.kind === kind).map((accent) => accent.angle)
          // A kind with two or more accents has some on each side of the plant.
          if (angles.length >= 2) {
            expect(angles.some(left), kind + " stage " + stage + " seed " + seed).toBe(true)
            expect(angles.some((angle) => !left(angle)), kind + " stage " + stage + " seed " + seed).toBe(true)
          }
        }
        // Overall, the accents lean no more to one side than the other.
        const mean = accents.reduce((sum, accent) => sum + accent.angle, 0) / accents.length
        expect(Math.abs(mean - Math.PI / 2), "stage " + stage + " seed " + seed).toBeLessThan(Math.PI * 0.14)
      }
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
      for (let time = 0; time <= ACCENTS_END + 0.2; time += 0.02) {
        const frame = accentFrame(accent, big, time)
        if (!frame) continue
        shown++
        expect(frame.y).toBeLessThan(big.y)
        expect(frame.opacity).toBeGreaterThanOrEqual(0)
        expect(frame.opacity).toBeLessThanOrEqual(1)
      }
      expect(shown).toBeGreaterThan(0)
      expect(accentFrame(accent, big, ACCENTS_END + 0.01)).toBeNull()
    }
  })

  it("stays on screen half a second longer than it takes to move into place", () => {
    expect(ACCENTS.linger).toBe(0.5)
    for (const accent of makeAccents(3, 4, 1, area(1), true)) {
      expect(accent.life).toBeCloseTo(accent.motion + 0.5, 9)
      // Still showing, and not yet fading to nothing, just after it has finished moving.
      const frame = accentFrame(accent, area(1), accent.delay + accent.motion + 0.2)
      expect(frame).not.toBeNull()
      expect(frame!.opacity).toBeGreaterThan(0)
    }
    expect(ACCENTS_END).toBeCloseTo(ACCENTS.maxDelay + 0.55 + 0.5, 9)
  })

  it("sits close around a small plant, in step with its size, and lets lines travel less far than the plant grows", () => {
    const small = accentRing(area(0.28))
    const middle = accentRing(area(0.46))
    const full = accentRing(area(1))
    expect(small.across).toBeLessThan(middle.across)
    expect(middle.across).toBeLessThan(full.across)
    // The ring grows in step with the plant, so the first accents are as close as the plant is small.
    expect(full.across / small.across).toBeCloseTo(1 / 0.28, 5)
    expect(full.up / small.up).toBeCloseTo(1 / 0.28, 5)
    const lineTravel = (scale: number) => {
      const line = makeAccents(7, 3, scale, area(scale), false).find((accent) => accent.kind === "line")!
      return accentFrame({ ...line, delay: 0 }, area(scale), line.motion)!.travel
    }
    expect(lineTravel(1)).toBeGreaterThan(lineTravel(0.28))
    expect(lineTravel(1) / lineTravel(0.28)).toBeLessThan((1 / 0.28) * 0.6)
  })

  it("draws shapes while it runs, stars only on the last stage, and nothing at the end", () => {
    const last = makeAccents(5, 4, 1, area(1), true)
    const middle = renderToStaticMarkup(<svg><GrowthAccents accents={last} area={area(1)} time={0.7} /></svg>)
    expect(middle).toContain("<line")
    expect(middle).toContain("<circle")
    expect(middle).toContain("<path")
    const early = makeAccents(5, 2, 0.4, area(0.4), false)
    const earlyMarkup = renderToStaticMarkup(<svg><GrowthAccents accents={early} area={area(0.4)} time={0.7} /></svg>)
    expect(earlyMarkup).not.toContain("<path")
    expect(renderToStaticMarkup(<svg><GrowthAccents accents={last} area={area(1)} time={ACCENTS_END + 0.1} /></svg>)).not.toContain("<line")
  })
})
