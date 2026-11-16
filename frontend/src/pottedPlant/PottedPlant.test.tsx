import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { VIEWBOX } from "./genome"
import { PeaceLily, PeaceLilyDrawing } from "./plants/peaceLily"
import { PottedPlant } from "./PottedPlant"
import { createPeaceLily } from "./plants/peaceLily/peaceLilyStages"
import { Pilea, PileaDrawing } from "./plants/pilea"
import { createPilea } from "./plants/pilea/pileaStages"
import { POT_PALETTES, POT_SHAPE, potLookFromSeed, type PotLook } from "./pots"
import { PLANT_TYPES } from "./plants/plantTypes"
import { Pothos, PothosDrawing, createPothos } from "./plants/pothos"

const LOOK: PotLook = { palette: 3, band: "stripe", finish: "solid", seed: 99 }
const OTHER_LOOK: PotLook = { palette: 1, band: "none", finish: "solid", seed: 7 }

/** The last thing the pot draws. Everything after it in the markup belongs to the plant. */
const END_OF_POT = `fill="${POT_SHAPE.soilHighlight.color}"`
const plantPart = (markup: string) => markup.slice(markup.indexOf(END_OF_POT))

const POTTED = [
  {
    name: "pothos",
    drawing: <PothosDrawing seed={7} />,
    composed: (pot?: PotLook) => <Pothos seed={7} pot={pot} />,
  },
  {
    name: "peace lily",
    drawing: <PeaceLilyDrawing seed={7} />,
    composed: (pot?: PotLook) => <PeaceLily seed={7} pot={pot} />,
  },
  {
    name: "pilea",
    drawing: <PileaDrawing seed={7} />,
    composed: (pot?: PotLook) => <Pilea seed={7} pot={pot} />,
  },
]

describe("a plant no longer carries its pot", () => {
  it("has no pot, band or finish in the pothos and peace lily results", () => {
    for (const plant of [createPothos(7), createPeaceLily(7)]) {
      for (const key of ["pot", "band", "finish"]) expect(plant).not.toHaveProperty(key)
    }
  })

  it("has no pot, band or finish in the pilea result", () => {
    for (const key of ["pot", "band", "finish"]) expect(createPilea(7)).not.toHaveProperty(key)
  })

  it("draws the bare plant with no svg and no pot", () => {
    for (const { drawing } of POTTED) {
      const markup = renderToStaticMarkup(drawing)
      expect(markup).not.toContain("<svg")
      expect(markup).not.toContain(END_OF_POT)
      expect(markup).not.toContain(POT_SHAPE.body.path)
    }
  })
})

describe("PottedPlant", () => {
  it("makes one picture with the pot drawn before the plant", () => {
    for (const { name, drawing } of POTTED) {
      const markup = renderToStaticMarkup(
        <PottedPlant look={LOOK} title="A plant">
          {drawing}
        </PottedPlant>,
      )
      expect(markup.match(/<svg/g), name).toHaveLength(1)
      const potEnd = markup.indexOf(END_OF_POT)
      const plantStart = markup.indexOf("stroke=")
      expect(markup.indexOf(POT_SHAPE.body.path), name).toBeGreaterThan(-1)
      expect(potEnd, name).toBeGreaterThan(-1)
      expect(plantStart, name).toBeGreaterThan(potEnd)
    }
  })

  it("draws the look it is given", () => {
    for (const { drawing } of POTTED) {
      const markup = renderToStaticMarkup(
        <PottedPlant look={LOOK} title="A plant">
          {drawing}
        </PottedPlant>,
      )
      expect(markup).toContain(POT_PALETTES[LOOK.palette].body)
      expect(markup).not.toContain(POT_PALETTES[OTHER_LOOK.palette].body)
    }
  })

  it("puts any pot with any plant, and the plant is drawn the same in every pot", () => {
    for (const { name, drawing } of POTTED) {
      const render = (look: PotLook) =>
        renderToStaticMarkup(
          <PottedPlant look={look} title="A plant">
            {drawing}
          </PottedPlant>,
        )
      expect(render(LOOK), name).not.toBe(render(OTHER_LOOK))
      expect(plantPart(render(LOOK)), name).toBe(plantPart(render(OTHER_LOOK)))
    }
  })

  it("draws the same markup twice for the same seed", () => {
    for (const { name, composed } of POTTED) {
      expect(renderToStaticMarkup(composed()), name).toBe(renderToStaticMarkup(composed()))
    }
  })

  it("only changes the picture width when scaled", () => {
    const strip = (html: string) => html.replace(/\s*style="[^"]*"/g, "")
    const render = (scale?: number) =>
      renderToStaticMarkup(
        <PottedPlant look={LOOK} scale={scale} title="A plant">
          <PothosDrawing seed={7} />
        </PottedPlant>,
      )
    expect(render(0.4)).toContain("width:40%")
    expect(strip(render(0.4))).toBe(strip(render()))
  })
})

describe("the shared frame", () => {
  it("trims the top of the original canvas and keeps its width", () => {
    expect(VIEWBOX).toBe("0 30 200 205")
  })

  it("gives every plant the same frame and the same pot", () => {
    const markups = PLANT_TYPES.map((plant) => ({
      id: plant.id,
      markup: renderToStaticMarkup(<plant.Preview seed={42} />),
    }))
    expect(markups).toHaveLength(10)
    const viewBox = (markup: string) => markup.match(/viewBox="([^"]*)"/)![1]
    const pot = (markup: string) => markup.slice(markup.indexOf("<g>"), markup.indexOf(END_OF_POT))
    for (const { id, markup } of markups) {
      expect(viewBox(markup), id).toBe(VIEWBOX)
      expect(pot(markup), id).toBe(pot(markups[0].markup))
    }
  })
})

describe("the composed plants", () => {
  it("default to the pot look their seed gives", () => {
    for (const { name, composed } of POTTED) {
      const look = potLookFromSeed(7)
      const markup = renderToStaticMarkup(composed())
      expect(markup, name).toContain(POT_PALETTES[look.palette].body)
    }
  })

  it("use the pot they are given instead", () => {
    for (const { name, composed } of POTTED) {
      const markup = renderToStaticMarkup(composed(LOOK))
      expect(markup, name).toContain(POT_PALETTES[LOOK.palette].body)
      expect(plantPart(markup), name).toBe(plantPart(renderToStaticMarkup(composed(OTHER_LOOK))))
    }
  })

  it("draw the pot of a seed and the plant of a seed independently", () => {
    const withPot = (seed: number, pot: PotLook) => renderToStaticMarkup(<Pothos seed={seed} pot={pot} />)
    // Same pot, different plants: the pot part is the same, the plant part is not.
    const a = withPot(1, LOOK)
    const b = withPot(2, LOOK)
    expect(a.slice(0, a.indexOf(END_OF_POT))).toBe(b.slice(0, b.indexOf(END_OF_POT)))
    expect(plantPart(a)).not.toBe(plantPart(b))
  })
})
