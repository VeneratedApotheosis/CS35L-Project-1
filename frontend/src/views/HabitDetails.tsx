"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { getHabit, habitKeys } from "@/lib/habits"

/** Milestone 1 placeholder. Only display data returned by the protected API. */
export default function HabitDetails({ id }: { id: string }) {
  const { user, signOut } = useAuth()
  const habit = useQuery({
    queryKey: habitKeys.detail(user?.id ?? "signed-out", id),
    queryFn: () => getHabit(id),
    enabled: Boolean(user),
    retry: false,
  })

  const status = habit.error instanceof ApiError ? habit.error.status : undefined
  const unavailable = status === 404 || status === 400

  return (
    <main className="stack-lg">
      <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>
      {habit.isError ? (
        <Card className="stack-md">
          <div role="alert" className="stack-sm">
            <h1 className="text-h2">
              {unavailable ? "Habit not found" : status === 401 ? "Sign in to see this habit" : "Couldn't load this habit"}
            </h1>
            <p className="text-body text-secondary">
              {unavailable ? "This habit isn't available. Return to your Garden to see your habits."
                : status === 401 ? "Your session has expired. Sign in again to continue."
                  : "Check your connection and try again."}
            </p>
          </div>
          {!unavailable && (status === 401 ? (
            <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
          ) : (
            <Button variant="secondary" className="self-start" onClick={() => void habit.refetch()} disabled={habit.isFetching}>
              {habit.isFetching ? "Trying again…" : "Try again"}
            </Button>
          ))}
        </Card>
      ) : habit.isPending ? (
        <p role="status" className="text-body text-secondary">Loading habit…</p>
      ) : (
        <h1 className="text-h1 garden-name">{habit.data.name}</h1>
      )}
    </main>
  )
}
