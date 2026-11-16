// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Pothos } from "../pothos/Pothos"
import { EmergeProvider } from "./EmergeContext"

afterEach(cleanup)

const draw = (emerge: boolean) => (
  <EmergeProvider emerge={emerge}>
    <Pothos seed={7} stage={4} stages={4} />
  </EmergeProvider>
)
/** The drawing, without the ids React makes up for each render. */
const markup = (container: HTMLElement) => container.innerHTML.replace(/_r_\d+_/g, "id")

describe("a plant that emerges", () => {
  it("is drawn complete at once when nothing asks it to emerge, as it always has been", () => {
    const first = markup(render(draw(false)).container)
    cleanup()
    const { container } = render(<Pothos seed={7} stage={4} stages={4} />)
    expect(markup(container) === first).toBe(true)
  })

  it("starts with no full leaves, grows out of the soil, and ends as the complete plant", async () => {
    const complete = markup(render(draw(false)).container)
    cleanup()
    const { container } = render(draw(true))
    // The first frame has the leaves as buds, not the complete plant.
    expect(markup(container) === complete).toBe(false)
    await waitFor(() => expect(markup(container) === complete).toBe(true), { timeout: 10_000 })
  })
})
