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

export const profileKeys = {
  user: (userId: string) => ["profile", userId] as const,
}

export function updateTimezone(timezone: string): Promise<Profile> {
  return api.patch<Profile>("/me", { timezone })
}

export function isValidTimezone(timezone: string): boolean {
  if (!timezone.trim()) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export function browserTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return timezone && isValidTimezone(timezone) ? timezone : "UTC"
}

/** Only initialize an empty profile; a saved preference survives travel/login. */
export async function initializeProfileTimezone(): Promise<Profile> {
  const profile = await getProfile()
  return profile.timezone ? profile : updateTimezone(browserTimezone())
}

export function profileWithToday(profile: Profile) {
  return { ...profile, today: dateInTimezone(profile.timezone) }
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
