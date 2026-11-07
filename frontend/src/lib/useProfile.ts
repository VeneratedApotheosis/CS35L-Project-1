"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { initializeProfileTimezone, profileKeys, profileWithToday } from "./profile"

/** One shared query deduplicates first-sign-in initialization across screens. */
export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKeys.user(user?.id ?? "signed-out"),
    queryFn: async () => profileWithToday(await initializeProfileTimezone()),
    enabled: Boolean(user),
    retry: false,
    // Keep today's label current across midnight, using the saved timezone.
    refetchInterval: 60_000,
  })
}
