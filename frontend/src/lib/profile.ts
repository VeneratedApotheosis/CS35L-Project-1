import { api } from "./api"

export interface Profile {
  id: string
  email?: string
  display_name: string
  avatar_url: string | null
  timezone: string | null
}

export function getProfile(): Promise<Profile> {
  return api.get<Profile>("/me")
}

/** Match the backend's UTC fallback rather than the browser's timezone. */
export function dateInTimezone(timezone: string | null, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const part = (type: string) => parts.find((item) => item.type === type)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}
