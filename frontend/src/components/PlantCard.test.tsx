import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"
import { PlantCard, type PlantCardProps } from "./PlantCard"

const props: PlantCardProps = {
  name: "Read a little", plantType: "pothos", seed: 42, stage: 1,
  health: "healthy", count: 2, target: 3, periodLabel: "This week",
  onLogActivity: vi.fn(), onViewDetails: vi.fn(), onEditHabit: vi.fn(),
}

describe("PlantCard", () => {
  it("draws every supported plant at all four growth stages", () => {
    for (const plant of PLANT_TYPES) {
      const drawings = [1, 2, 3, 4].map((stage) => renderToStaticMarkup(
        <PlantCard {...props} plantType={plant.id} stage={stage as PlantCardProps["stage"]} />,
      ))
      for (const drawing of drawings) expect(drawing).toContain('<svg')
      expect(new Set(drawings).size).toBe(4)
    }
  })

  it.each([
    ["healthy", "Healthy"], ["slightly_wilted", "Slightly wilted"], ["wilted", "Wilted"],
  ] as const)("exposes the %s health state as text and an icon", (health, label) => {
    const markup = renderToStaticMarkup(<PlantCard {...props} health={health} />)
    expect(markup).toContain(`data-health="${health}"`)
    expect(markup).toContain(`${label}</span>`)
    expect(markup).toContain('class="plant-card__health text-body-sm"')
  })

  it("names the options trigger and detail action and preserves excess progress", () => {
    const markup = renderToStaticMarkup(<PlantCard {...props} count={4} />)
    expect(markup).toContain('aria-label="Options for Read a little"')
    expect(markup).toContain('aria-label="View details for Read a little"')
    expect(markup).toContain('aria-label="Read a little: This week"')
    expect(markup).toContain('aria-valuetext="4 of 3 activities, goal met"')
    for (const action of ["Log activity", "View details", "Edit habit"]) {
      expect(markup).toContain(`>${action}</span>`)
    }
    expect(props.onLogActivity).not.toHaveBeenCalled()
  })
})
