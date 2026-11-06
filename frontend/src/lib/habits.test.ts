import { describe, expect, it, vi } from "vitest"
import {
  buildCreateHabitPayload,
  parseWholeNumber,
  type CreateHabitForm,
} from "./habits"

// habits.ts imports api.ts, which creates the Supabase client. Not needed here.
vi.mock("./supabase", () => ({ supabase: {} }))

// The keys of createHabitBody in backend/src/routes/habits.ts. The backend
// rejects any other key.
const ALLOWED_KEYS = [
  "name",
  "description",
  "plant_type",
  "target_count",
  "interval_count",
  "interval_unit",
  "num_periods",
  "start_date",
]

const form: CreateHabitForm = {
  name: "  Go to the gym  ",
  description: "  Leg day too  ",
  plantType: "peace_lily",
  targetCount: 3,
  intervalCount: 1,
  intervalUnit: "week",
  numPeriods: 4,
  startDate: "2030-01-02",
}

describe("buildCreateHabitPayload", () => {
  it("trims the name and description", () => {
    const payload = buildCreateHabitPayload(form)
    expect(payload.name).toBe("Go to the gym")
    expect(payload.description).toBe("Leg day too")
  })

  it("omits an empty description", () => {
    const payload = buildCreateHabitPayload({ ...form, description: "   " })
    expect(payload).not.toHaveProperty("description")
  })

  it("omits start_date when the start date is untouched", () => {
    const payload = buildCreateHabitPayload({ ...form, startDate: undefined })
    expect(payload).not.toHaveProperty("start_date")
  })

  it("sends a chosen start date as given", () => {
    expect(buildCreateHabitPayload(form).start_date).toBe("2030-01-02")
  })

  it("sends numbers as numbers", () => {
    const payload = buildCreateHabitPayload(form)
    expect(payload.target_count).toBe(3)
    expect(payload.interval_count).toBe(1)
    expect(payload.num_periods).toBe(4)
    expect(payload.plant_type).toBe("peace_lily")
    expect(payload.interval_unit).toBe("week")
  })

  it("contains only keys the backend accepts", () => {
    const keys = Object.keys(buildCreateHabitPayload(form))
    expect(keys.sort()).toEqual([...ALLOWED_KEYS].sort())

    const minimal = buildCreateHabitPayload({
      ...form,
      description: "",
      startDate: undefined,
    })
    for (const key of Object.keys(minimal)) {
      expect(ALLOWED_KEYS).toContain(key)
    }
    expect(JSON.parse(JSON.stringify(minimal))).toEqual(minimal)
  })
})

describe("parseWholeNumber", () => {
  it("parses whole numbers", () => {
    expect(parseWholeNumber("3")).toBe(3)
    expect(parseWholeNumber(" 52 ")).toBe(52)
  })

  it("returns NaN for empty, fractional, exponent and negative input", () => {
    for (const value of ["", "  ", "3.5", "1e1", "-2", "abc"]) {
      expect(Number.isNaN(parseWholeNumber(value))).toBe(true)
    }
  })
})