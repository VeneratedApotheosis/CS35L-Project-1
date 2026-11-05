import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ProgressBar } from "./ProgressBar"

const render = (count: number, target: number) =>
  renderToStaticMarkup(<ProgressBar label="Reading this week" count={count} target={target} />)

describe("ProgressBar", () => {
  it("exposes a named progressbar with an empty, partial, or complete value", () => {
    for (const count of [0, 2, 3]) {
      const markup = render(count, 3)
      expect(markup).toContain('role="progressbar"')
      expect(markup).toContain('aria-label="Reading this week"')
      expect(markup).toContain('aria-valuemin="0"')
      expect(markup).toContain('aria-valuemax="3"')
      expect(markup).toContain(`aria-valuenow="${count}"`)
      expect(markup).toContain('habit-progress__track--segmented')
    }
  })

  it("caps the bar's accessible value while preserving the real count in text", () => {
    const markup = render(4, 3)
    expect(markup).toContain('aria-valuenow="3"')
    expect(markup).toContain('aria-valuetext="4 of 3 activities, goal met"')
    expect(markup).toContain('>4/3</span>')
  })

  it("supports every target from 1 through 50, including an excess count", () => {
    for (let target = 1; target <= 50; target++) {
      for (const count of [0, Math.floor(target / 2), target, target + 1]) {
        const markup = render(count, target)
        if (target <= 10) {
          expect(markup.match(/class="habit-progress__step(?: |")/g)).toHaveLength(target)
          expect(markup.match(/habit-progress__step--complete/g) ?? [])
            .toHaveLength(Math.min(count, target))
        } else {
          expect(markup).not.toContain('class="habit-progress__step')
          expect(markup).toContain('class="habit-progress__fill"')
          expect(markup).toContain(`width:${(Math.min(count, target) / target) * 100}%`)
        }
      }
    }
  })

  it("shows the exact proportion for a large goal without tick marks", () => {
    const markup = render(27, 50)
    expect(markup).toContain('style="width:54%"')
    expect(markup).toContain('>27/50</span>')
    expect(markup).toContain('aria-valuenow="27"')
    expect(markup).not.toContain('habit-progress__track--segmented')
  })
})
