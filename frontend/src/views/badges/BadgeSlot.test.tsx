// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BadgeSlot, tipPlacement } from "./BadgeSlot"
import { buildGroups } from "./groups"
import { sampleBadgeBook } from "./sampleBadgeBook"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("tipPlacement", () => {
  it("puts the card below when it fits", () => {
    expect(tipPlacement({ top: 100, bottom: 180 }, 150, 800)).toBe("below")
  })

  it("puts the card above when it would run past the bottom of the window", () => {
    expect(tipPlacement({ top: 600, bottom: 680 }, 150, 800)).toBe("above")
  })

  it("stays below when there is no room above either", () => {
    expect(tipPlacement({ top: 50, bottom: 130 }, 150, 200)).toBe("below")
  })

  it("uses a fallback height when the card cannot be measured", () => {
    expect(tipPlacement({ top: 600, bottom: 700 }, 0, 800)).toBe("above")
    expect(tipPlacement({ top: 100, bottom: 200 }, 0, 800)).toBe("below")
  })
})

describe("BadgeSlot", () => {
  const item = buildGroups(sampleBadgeBook)[0].items[0]

  function slotAt(top: number, bottom: number) {
    render(<BadgeSlot item={item} onOpen={() => {}} />)
    const slot = screen.getByRole("button")
    vi.spyOn(slot, "getBoundingClientRect").mockReturnValue({ top, bottom } as DOMRect)
    return slot
  }

  it("flips the card above a badge near the bottom of the window on hover", () => {
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800)
    const slot = slotAt(650, 730)
    expect(slot.dataset.tip).toBe("below")
    fireEvent.pointerEnter(slot)
    expect(slot.dataset.tip).toBe("above")
  })

  it("keeps the card below a badge with room on focus", () => {
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800)
    const slot = slotAt(100, 180)
    fireEvent.focus(slot)
    expect(slot.dataset.tip).toBe("below")
  })
})
