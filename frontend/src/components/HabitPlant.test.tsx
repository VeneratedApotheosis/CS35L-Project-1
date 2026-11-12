// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import type { HabitWithStats } from "@/lib/habits"
import { habitSeed } from "@/plants/habitSeed"
import { HabitPlant } from "./HabitPlant"
import { PlantCard } from "./PlantCard"

vi.mock("@/plants/plantTypes", () => ({
  plantTypeById: () => ({ label: "Pothos", Preview: ({ seed, stage }: { seed: number; stage: number }) => (
    <svg data-testid="plant" data-seed={seed} data-stage={stage} />
  ) }),
}))
const habit: HabitWithStats = {
  id: "f3270783-4c61-4f96-81ae-627d56392a5a", owner_id: "user-a", name: "Read",
  description: null, plant_type: "pothos", target_count: 3, interval_count: 1,
  interval_unit: "week", num_periods: 4, start_date: "2026-11-01", created_at: "2026-11-01",
  stats: { state: "active", stage: 2, health: "wilted", overall_progress: 0.4,
    current_period: { number: 2, total: 4, start: "2026-11-08", end: "2026-11-15", count: 4, target: 3 } },
}
afterEach(cleanup)

it("keeps the seed stable across remounts and distinguishes habit ids", () => {
  const first = render(<HabitPlant habit={habit} />)
  const seed = screen.getByTestId("plant").getAttribute("data-seed")
  first.unmount()
  render(<HabitPlant habit={habit} />)
  expect(screen.getByTestId("plant").getAttribute("data-seed")).toBe(seed)
  expect(habitSeed("another-habit")).not.toBe(habitSeed(habit.id))
})

it("uses identical stage and seed in Garden and Details with a visible health label", () => {
  render(<>
    <PlantCard name={habit.name} plantType={habit.plant_type} seed={habitSeed(habit.id)}
      stage={habit.stats.stage} health={habit.stats.health} count={4} target={3}
      periodLabel="Current period" detailsHref={`/habits/${habit.id}`} />
    <HabitPlant habit={habit} />
  </>)
  const plants = screen.getAllByTestId("plant")
  expect(plants[0].getAttribute("data-seed")).toBe(plants[1].getAttribute("data-seed"))
  expect(plants.map((plant) => plant.getAttribute("data-stage"))).toEqual(["2", "2"])
  expect(screen.getByText("Pothos · Stage 2 · Wilted")).toBeTruthy()
  expect(plants[1].parentElement?.getAttribute("data-health")).toBe("wilted")
})

it("updates stage and health from new stats without changing the seed", () => {
  const view = render(<HabitPlant habit={habit} />)
  const seed = screen.getByTestId("plant").getAttribute("data-seed")
  view.rerender(<HabitPlant habit={{ ...habit, stats: { ...habit.stats, stage: 4, health: "healthy" } }} />)
  expect(screen.getByTestId("plant").getAttribute("data-seed")).toBe(seed)
  expect(screen.getByTestId("plant").getAttribute("data-stage")).toBe("4")
  expect(screen.getByText("Pothos · Stage 4 · Healthy")).toBeTruthy()
})
