import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { mulberry32 } from "../../rng"
import {
  Pot,
  POT_FINISH_IDS,
  POT_FINISH_WEIGHTS,
  POT_SHAPE,
  getFinish,
  pickPotFinish,
  potLookFromSeed,
  type PotLook,
} from "../index"

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1)

const render = (look: Partial<PotLook> = {}, size = 1) =>
  renderToStaticMarkup(
    <svg>
      <Pot look={{ palette: 0, band: "stripe", finish: "solid", seed: 1, ...look }} size={size} id="t" />
    </svg>,
  )

describe("the finish registry", () => {
  it("lists at least the solid finish, once each", () => {
    expect(POT_FINISH_IDS).toContain("solid")
    expect(new Set(POT_FINISH_IDS).size).toBe(POT_FINISH_IDS.length)
  })

  it("has a weight for every finish, and no weight without a finish", () => {
    expect(Object.keys(POT_FINISH_WEIGHTS).sort()).toEqual([...POT_FINISH_IDS].sort())
    for (const id of POT_FINISH_IDS) expect(POT_FINISH_WEIGHTS[id]).toBeGreaterThanOrEqual(0)
  })

  it("makes at least one finish possible", () => {
    expect(Object.values(POT_FINISH_WEIGHTS).some((weight) => weight > 0)).toBe(true)
  })

  it("finds every finish by its id", () => {
    for (const id of POT_FINISH_IDS) expect(getFinish(id).id).toBe(id)
  })

  it("throws a RangeError for an id that is not registered", () => {
    expect(() => getFinish("not-a-finish")).toThrow(RangeError)
    expect(() => getFinish("not-a-finish")).toThrow("not-a-finish")
  })
})

describe("pickPotFinish", () => {
  it("gives every seed solid while solid is the only finish with weight", () => {
    for (const seed of SEEDS) expect(potLookFromSeed(seed).finish).toBe("solid")
  })

  it("follows the weights it is given", () => {
    const even = { solid: 1, other: 1 }
    const picks = SEEDS.map((seed) => pickPotFinish(mulberry32(seed), even))
    expect(picks.filter((id) => id === "other").length).toBeGreaterThan(60)
    expect(picks.filter((id) => id === "solid").length).toBeGreaterThan(60)

    const heavy = { solid: 1, other: 3 }
    const heavyOther = SEEDS.filter((seed) => pickPotFinish(mulberry32(seed), heavy) === "other").length
    expect(heavyOther).toBeGreaterThan(picks.filter((id) => id === "other").length)
  })

  it("never picks a finish with weight 0", () => {
    const weights = { a: 0, b: 2, c: 0, d: 1 }
    for (const seed of SEEDS) expect(["b", "d"]).toContain(pickPotFinish(mulberry32(seed), weights))
  })

  it("takes one draw whatever the weights, so palette and band never depend on them", () => {
    const rngA = mulberry32(5)
    const rngB = mulberry32(5)
    pickPotFinish(rngA, { solid: 1 })
    pickPotFinish(rngB, { solid: 1, other: 4, another: 2 })
    expect(rngA()).toBe(rngB())
  })

  it("throws when no finish has weight", () => {
    expect(() => pickPotFinish(mulberry32(1), { solid: 0 })).toThrow(RangeError)
  })
})

describe("the solid finish", () => {
  it("draws the stripe inside the clipped body, between the shade and the highlight", () => {
    const markup = render()
    const clipGroup = markup.indexOf(`clip-path="url(#t${POT_SHAPE.body.clipIdSuffix})"`)
    const shade = markup.indexOf(`opacity="${POT_SHAPE.shade.opacity}"`)
    const stripe = markup.indexOf(`y="${POT_SHAPE.stripe.centerY - POT_SHAPE.stripe.thickness / 2}"`)
    const highlight = markup.indexOf(`opacity="${POT_SHAPE.highlight.opacity}"`)
    expect(clipGroup).toBeGreaterThan(-1)
    expect(shade).toBeGreaterThan(clipGroup)
    expect(stripe).toBeGreaterThan(shade)
    expect(highlight).toBeGreaterThan(stripe)
  })

  it("draws no stripe for a plain band", () => {
    expect(render({ band: "none" })).not.toContain(`y="${POT_SHAPE.stripe.centerY - POT_SHAPE.stripe.thickness / 2}"`)
  })
})

describe("POT_SHAPE.body.bounds", () => {
  it("is the smallest box around the body path", () => {
    const numbers = POT_SHAPE.body.path.match(/-?\d+(\.\d+)?/g)!.map(Number)
    const xs = numbers.filter((_, i) => i % 2 === 0)
    const ys = numbers.filter((_, i) => i % 2 === 1)
    const { x, y, width, height } = POT_SHAPE.body.bounds
    expect(Math.min(...xs)).toBe(x)
    expect(Math.max(...xs)).toBe(x + width)
    expect(Math.min(...ys)).toBe(y)
    expect(Math.max(...ys)).toBe(y + height)
  })
})
