"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { badgeKeys, getBadgeBook } from "@/lib/badges"
import { BadgeCollection } from "./badges/BadgeCollection"
import { LookBackTabs } from "./badges/LookBackTabs"
import { buildGroups } from "./badges/groups"

/**
 * The Badges page (#253). Reads the badge book from GET /me/badges, which also
 * stores any badge earned since the last check (for example a habit that
 * expired overnight). See docs/badges-plan.md.
 */
export default function Badges() {
  const { user, signOut } = useAuth()
  const query = useQuery({
    queryKey: badgeKeys.book(user?.id ?? "signed-out"),
    queryFn: getBadgeBook,
    enabled: Boolean(user),
    retry: false,
  })
  const groups = useMemo(() => (query.data ? buildGroups(query.data) : null), [query.data])
  const unauthorized = query.error instanceof ApiError && query.error.status === 401

  return (
    <main className="stack-lg">
      <header className="stack-sm">
        <h1 className="text-h1">Badges</h1>
        <p className="text-body text-secondary">Everything you have earned by showing up for your habits.</p>
      </header>
      <LookBackTabs current="/badges" />

      {query.isError && (
        <Card className="stack-md">
          <div role="alert" className="stack-sm">
            <h2 className="text-h3">{unauthorized ? "Sign in to see your badges" : "Couldn't load your badges"}</h2>
            <p className="text-body text-secondary">
              {unauthorized ? "Your session has expired. Sign in again to continue." : "Check your connection and try again."}
            </p>
          </div>
          {unauthorized ? (
            <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
          ) : (
            <Button variant="secondary" className="self-start" onClick={() => void query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? "Trying again…" : "Try again"}
            </Button>
          )}
        </Card>
      )}

      {query.isPending && !query.isError && (
        <p role="status" className="text-body text-secondary">Loading your badges…</p>
      )}

      {groups && <BadgeCollection groups={groups} />}
    </main>
  )
}
