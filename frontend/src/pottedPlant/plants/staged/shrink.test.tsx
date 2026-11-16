// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Pothos } from "../pothos/Pothos"
import { ShrinkProvider } from "./ShrinkContext"

afterEach(cleanup)

const draw = (stage: number) => <Pothos seed={7} stage={stage} stages={4} />
/** The drawing, without the ids React makes up for each render. */
const markup = (container: HTMLElement) => container.innerHTML.replace(/_r_\d+_/g, "id")

describe("moving down a stage", () => {
  it("changes at once when nothing asks for an animation, as it always has", () => {
    const small = markup(render(draw(1)).container)
    cleanup()
    const { container, rerender } = render(draw(4))
    rerender(draw(1))
    expect(markup(container) === small).toBe(true)
  })

  it("plays the growth backwards inside a ShrinkProvider: it starts at the big plant and ends at the small one", async () => {
    const small = markup(render(draw(1)).container)
    cleanup()
    const big = markup(render(draw(4)).container)
    cleanup()

    const { container, rerender } = render(<ShrinkProvider seconds={0.1}>{draw(4)}</ShrinkProvider>)
    rerender(<ShrinkProvider seconds={0.1}>{draw(1)}</ShrinkProvider>)
    // The first frame of the move is still the big plant...
    expect(markup(container) === big).toBe(true)
    // ...and it settles on the small one, with no leftover animation.
    await waitFor(() => expect(markup(container) === small).toBe(true), { timeout: 10_000 })
  })

  it("can start in the middle of a growth and shrinks from the way the plant looks then, with no jump to the big plant", () => {
    const big = markup(render(draw(4)).container)
    cleanup()
    const { container, rerender } = render(<ShrinkProvider seconds={0.1}>{draw(1)}</ShrinkProvider>)
    rerender(<ShrinkProvider seconds={0.1}>{draw(4)}</ShrinkProvider>)
    // The growth has only just begun, so the plant still looks small...
    rerender(<ShrinkProvider seconds={0.1}>{draw(1)}</ShrinkProvider>)
    // ...and turning round now does not show the big plant for a moment.
    expect(markup(container) === big).toBe(false)
  })
})
