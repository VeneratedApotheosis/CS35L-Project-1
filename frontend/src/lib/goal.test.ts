import { afterEach, describe, expect, it, vi } from "vitest"
import {
  computeEndDate,
  durationPhrase,
  goalSentence,
  periodPhrase,
  todayISO,
} from "./goal"

describe("computeEndDate", () => {
  it("adds days", () => {
    expect(computeEndDate("2026-03-10", "day", 1, 5)).toBe("2026-03-15")
    expect(computeEndDate("2026-12-30", "day", 3, 2)).toBe("2027-01-05")
  })

  it("adds weeks as seven days each", () => {
    expect(computeEndDate("2026-03-10", "week", 1, 4)).toBe("2026-04-07")
    expect(computeEndDate("2026-03-10", "week", 2, 3)).toBe("2026-04-21")
  })

  it("adds months", () => {
    expect(computeEndDate("2026-03-10", "month", 1, 3)).toBe("2026-06-10")
    expect(computeEndDate("2026-11-15", "month", 2, 2)).toBe("2027-03-15")
  })

  it("clamps to the end of a shorter month", () => {
    expect(computeEndDate("2026-01-31", "month", 1, 1)).toBe("2026-02-28")
    expect(computeEndDate("2028-01-31", "month", 1, 1)).toBe("2028-02-29")
    expect(computeEndDate("2026-08-31", "month", 1, 1)).toBe("2026-09-30")
  })
})

describe("phrases", () => {
  it("writes the period", () => {
    expect(periodPhrase(1, "week")).toBe("every week")
    expect(periodPhrase(3, "day")).toBe("every 3 days")
  })

  it("writes the duration in units when the interval is 1", () => {
    expect(durationPhrase(1, "week", 4)).toBe("for 4 weeks")
    expect(durationPhrase(1, "month", 1)).toBe("for 1 month")
  })

  it("writes the duration in periods otherwise", () => {
    expect(durationPhrase(2, "week", 3)).toBe("for 3 periods")
    expect(durationPhrase(2, "week", 1)).toBe("for 1 period")
  })
})

describe("goalSentence", () => {
  it("builds the sentence", () => {
    expect(
      goalSentence({
        name: " Go to the gym ",
        targetCount: 3,
        intervalCount: 1,
        intervalUnit: "week",
        numPeriods: 4,
      }),
    ).toBe("Go to the gym 3 times every week for 4 weeks.")
  })

  it("uses singular 'time' and a fallback name", () => {
    expect(
      goalSentence({
        name: "  ",
        targetCount: 1,
        intervalCount: 2,
        intervalUnit: "day",
        numPeriods: 5,
      }),
    ).toBe("This habit 1 time every 2 days for 5 periods.")
  })
})

describe("todayISO", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("is a YYYY-MM-DD string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("uses the local calendar date", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 23, 30))
    expect(todayISO()).toBe("2026-06-15")
  })
})