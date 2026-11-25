import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const dir = "src/styles"
const sheets = [
  join(dir, "globalStyles.css"),
  ...readdirSync(join(dir, "components")).map((name) => join(dir, "components", name)),
].filter((path) => path.endsWith(".css"))

// Every border, outline and focus gap is one of the line-weight tokens in tokens/effects.css, so
// the weights can be changed in one place. (A gauge such as the progress ring is not a line.)
const raw = [
  { what: "a border with its own width", pattern: /(?<![-\w])border(?:-(?:top|right|bottom|left|inline|inline-start|inline-end|block))?\s*:[^;{}]*\b\d*\.?\d+(px|rem)\b/ },
  { what: "an outline with its own width", pattern: /\boutline\s*:[^;{}]*\b\d*\.?\d+(px|rem)\b/ },
  { what: "an outline gap of its own", pattern: /\boutline-offset\s*:\s*-?\d*\.?\d+(px|rem)\b/ },
]

describe("line weights", () => {
  it("are defined once, as tokens", () => {
    const tokens = readFileSync(join(dir, "tokens", "effects.css"), "utf8")
    for (const name of ["--line-thin", "--line-medium", "--line-thick", "--focus-offset", "--icon-stroke"]) {
      expect(tokens).toContain(`${name}:`)
    }
  })

  for (const path of sheets) {
    it(`${path} uses no raw border or outline width`, () => {
      const css = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
      const found = css.split("\n").flatMap((line, index) =>
        raw.filter(({ pattern }) => pattern.test(line)).map(({ what }) => `line ${index + 1}: ${what}`))
      expect(found).toEqual([])
    })
  }
})
