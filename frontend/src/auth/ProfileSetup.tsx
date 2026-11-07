"use client"

import type { ReactNode } from "react"
import { useAuth } from "./useAuth"
import { ApiError } from "@/lib/api"
import { useProfile } from "@/lib/useProfile"
import { Button } from "@/components/Button"

/** Wait for the user's timezone before enabling date-sensitive actions. */
export function ProfileSetup({ children }: { children: ReactNode }) {
  const profile = useProfile()
  const { signOut } = useAuth()
  if (profile.isPending) {
    return <main><p role="status" className="text-body text-secondary">Loading your profile…</p></main>
  }
  // A failed background refresh must not interrupt an already loaded page.
  if (!profile.data && profile.isError) {
    const unauthorized = profile.error instanceof ApiError && profile.error.status === 401
    return (
      <main className="stack-md">
        <div role="alert" className="stack-sm">
          <h1 className="text-h2">{unauthorized ? "Sign in to continue" : "Couldn't load your profile"}</h1>
          <p className="text-body text-secondary">
            {unauthorized ? "Your session has expired. Sign in again to continue." : "Check your connection and try again."}
          </p>
        </div>
        {unauthorized ? (
          <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
        ) : (
          <Button className="self-start" onClick={() => void profile.refetch()} disabled={profile.isFetching}>
            {profile.isFetching ? "Trying again…" : "Try again"}
          </Button>
        )}
      </main>
    )
  }
  return children
}
