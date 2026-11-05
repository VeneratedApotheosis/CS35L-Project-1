import { DateTime } from "luxon";

// The local calendar date (YYYY-MM-DD) in an IANA zone. A missing or invalid
// zone means UTC.
export function todayInZone(
  zone: string | null,
  now: Date = new Date(),
): string {
  const local = DateTime.fromJSDate(now, { zone: zone ?? "utc" });
  const date = local.isValid
    ? local
    : DateTime.fromJSDate(now, { zone: "utc" });
  return date.toISODate() as string;
}

// Compares two YYYY-MM-DD dates.
export function isBeforeDate(a: string, b: string): boolean {
  return a < b;
}
