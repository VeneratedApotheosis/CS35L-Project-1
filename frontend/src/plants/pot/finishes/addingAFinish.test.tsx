import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { Pot, POT_SHAPE, type PotFinishId, type PotLook } from "../index"

/*
 * A finish that exists only in this test, registered by wrapping the registry's
 * lookup. It shows that a new finish needs nothing from Pot but its place in
 * the registry, and that what it draws is clipped to the body.
 */
vi.mock("./index", async (importOriginal) => {
  const real = await importOriginal<typeof import("./index")>()
  const { createElement } = await import("react")
  const fake = {
    id: "fake",
    draw: ({ rng, body, colors }: import("./types").PotFinishInput) =>
      createElement("circle", {
        "data-fake": "yes",
        cx: body.bounds.x + rng() * body.bounds.width,
        cy: body.bounds.y,
        r: 5,
        fill: colors.band,
      }),
  }
  return { ...real, getFinish: (id: string) => (id === "fake" ? fake : real.getFinish(id)) }
})

const FAKE = "fake" as unknown as PotFinishId

const render = (look: Partial<PotLook> = {}) =>
  renderToStaticMarkup(
    <svg>
      <Pot look={{ palette: 0, band: "none", finish: "solid", seed: 5, ...look }} id="t" />
    </svg>,
  )

describe("a finish added to the registry", () => {
  it("is drawn by Pot inside the clipped body, after the shade and before the highlight and rim", () => {
    const markup = render({ finish: FAKE })
    const clipGroup = markup.indexOf(`clip-path="url(#t${POT_SHAPE.body.clipIdSuffix})"`)
    const shade = markup.indexOf(`opacity="${POT_SHAPE.shade.opacity}"`)
    const fake = markup.indexOf("<circle data-fake")
    const highlight = markup.indexOf(`opacity="${POT_SHAPE.highlight.opacity}"`)
    const rim = markup.indexOf(`x="${POT_SHAPE.rim.x}"`)
    expect(clipGroup).toBeGreaterThan(-1)
    expect(fake).toBeGreaterThan(shade)
    expect(shade).toBeGreaterThan(clipGroup)
    expect(highlight).toBeGreaterThan(fake)
    expect(rim).toBeGreaterThan(highlight)
  })

  it("is not drawn by the solid finish", () => {
    expect(render()).not.toContain("data-fake")
  })

  it("draws from the look's pattern seed: same look, same pot, other seed, other pot", () => {
    expect(render({ finish: FAKE, seed: 5 })).toBe(render({ finish: FAKE, seed: 5 }))
    expect(render({ finish: FAKE, seed: 5 })).not.toBe(render({ finish: FAKE, seed: 6 }))
  })

  it("leaves the shape of the pot alone", () => {
    const body = (markup: string) => markup.match(/<path d="[^"]*"/g)
    expect(body(render({ finish: FAKE }))).toEqual(body(render()))
  })
})
