import type { IntervalUnit } from "./habits"

/**
 * Display-only helpers for the create-habit form: today's date, the computed
 * end date, and the goal-preview sentence. The backend is the authority for
 * the stored start and end dates (it uses the user's profile timezone); these
 * run in the browser's local time only to show a preview before saving.
 */

/** Today as a YYYY-MM-DD string in the browser's local time. */
export function todayISO(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

/**
 * End date of a habit: start + numPeriods periods, each intervalCount units.
 * A period is [start + k*interval, start + (k+1)*interval), so the habit ends
 * at start + numPeriods*interval. Month math clamps to the end of a short month.
 */
export function computeEndDate(
  startISO: string,
  intervalUnit: IntervalUnit,
  intervalCount: number,
  numPeriods: number,
): string {
  const [y, m, d] = startISO.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const total = intervalCount * numPeriods

  if (intervalUnit === "day") {
    date.setDate(date.getDate() + total)
  } else if (intervalUnit === "week") {
    date.setDate(date.getDate() + total * 7)
  } else {
    // Move to the 1st first so a long day-of-month cannot overflow into the
    // next month (Jan 31 + 1 month is Feb 28, not Mar 3).
    date.setDate(1)
    date.setMonth(date.getMonth() + total)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    date.setDate(Math.min(d, lastDay.getDate()))
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** A readable date, e.g. "Dec 8, 2026". Falls back to the ISO string. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`
}

/** "every week" or "every 3 weeks". */
export function periodPhrase(
  intervalCount: number,
  intervalUnit: IntervalUnit,
): string {
  return intervalCount === 1
    ? `every ${intervalUnit}`
    : `every ${intervalCount} ${intervalUnit}s`
}

/** "for 4 weeks" when the interval is 1, otherwise "for 4 periods". */
export function durationPhrase(
  intervalCount: number,
  intervalUnit: IntervalUnit,
  numPeriods: number,
): string {
  return intervalCount === 1
    ? `for ${plural(numPeriods, intervalUnit)}`
    : `for ${plural(numPeriods, "period")}`
}

/**
 * The goal-preview sentence, e.g.
 * "Go to the gym 3 times every week for 4 weeks."
 */
export function goalSentence(input: {
  name: string
  targetCount: number
  intervalCount: number
  intervalUnit: IntervalUnit
  numPeriods: number
}): string {
  const name = input.name.trim() || "This habit"
  const times = plural(input.targetCount, "time")
  const every = periodPhrase(input.intervalCount, input.intervalUnit)
  const duration = durationPhrase(
    input.intervalCount,
    input.intervalUnit,
    input.numPeriods,
  )
  return `${name} ${times} ${every} ${duration}.`
}
