"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { ProfileSetup } from "@/auth/ProfileSetup"
import { AppShell } from "@/components/AppShell"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { goalSentence, formatDate } from "@/lib/goal"
import { joinSharedInvite, previewSharedInvite, sharedHabitKeys } from "@/lib/sharedHabits"
import { sharedHabitHref } from "@/lib/paths"

const UNAVAILABLE = "This invite isn't available. Ask your friend for a new link."

function inviteError(error: unknown): { message: string; retry: boolean } {
  if (error instanceof ApiError) {
    if (error.status === 404) return { message: UNAVAILABLE, retry: false }
    if (error.code === "shared_habit_full") return { message: "This shared habit is full. There are no places left.", retry: false }
    if (error.code === "shared_habit_join_ended") return { message: "Joining has ended for this habit.", retry: false }
    if (error.status === 401) return { message: "Your session has expired. Sign in again to continue.", retry: false }
    if (error.status === 429) return { message: "Too many attempts. Wait a little, then try again.", retry: true }
  }
  return { message: "Couldn't connect to the invite. Please try again.", retry: true }
}

/** Public entry point so an invite survives sign-in without a /login detour. */
export default function JoinHabit({ code }: { code: string }) {
  const normalized = code.toLowerCase()
  const { user, loading } = useAuth()
  if (loading) return <main className="stack-lg"><p role="status">Checking sign-in…</p></main>
  if (!/^[a-f0-9]{32}$/.test(normalized)) {
    return <main className="stack-lg"><h1 className="text-h1">Join a shared habit</h1><p role="alert">{UNAVAILABLE}</p></main>
  }
  if (!user) return <InviteSignIn code={normalized} />
  return <AppShell><ProfileSetup><InvitePreview key={`${user.id}:${normalized}`} code={normalized} userId={user.id} /></ProfileSetup></AppShell>
}

function InviteSignIn({ code }: { code: string }) {
  const { signInWithGoogle } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const pendingRef = useRef(false)
  async function signIn() {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError("")
    try {
      await signInWithGoogle(code)
    } catch {
      setError("Google sign-in didn't start. Check your connection and try again.")
      pendingRef.current = false
      setPending(false)
    }
  }
  return (
    <main className="stack-lg" style={{ maxWidth: "42rem", margin: "0 auto", padding: "var(--page-padding)" }}>
      <h1 className="text-h1">Join a shared habit</h1>
      <p>Sign in to see your friend&apos;s invite. You&apos;ll return here to review it before joining.</p>
      <Button className="self-start" disabled={pending} onClick={() => void signIn()}>
        {pending ? "Connecting to Google…" : "Sign in with Google"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </main>
  )
}

function InvitePreview({ code, userId }: { code: string; userId: string }) {
  const client = useQueryClient()
  const { signOut } = useAuth()
  const joiningRef = useRef(false)
  const [joinedId, setJoinedId] = useState<string | null>(null)
  const preview = useQuery({
    queryKey: ["shared-invite", userId, code],
    queryFn: () => previewSharedInvite(code),
    retry: false,
    staleTime: 0,
  })
  const join = useMutation({
    mutationFn: () => joinSharedInvite(code),
    retry: false,
    onSuccess: (result) => {
      setJoinedId(result.id)
      void client.invalidateQueries({ queryKey: sharedHabitKeys.all(userId) })
    },
    onSettled: () => { joiningRef.current = false },
  })
  function handleJoin() {
    if (joiningRef.current || joinedId) return
    joiningRef.current = true
    join.mutate()
  }

  const error = join.error ?? preview.error
  const failure = error ? inviteError(error) : null
  const habit = preview.data
  return (
    <main className="stack-lg" style={{ maxWidth: "42rem", margin: "0 auto", padding: "var(--page-padding)" }}>
      <h1 className="text-h1">Join a shared habit</h1>
      {joinedId ? (
        <Card>
          <h2 className="text-h2">You&apos;re in!</h2>
          <p role="status">You are now a member of {habit?.name ?? "this shared habit"}.</p>
          <Link href={sharedHabitHref(joinedId)} className="button button--primary button--md self-start">View shared habit</Link>
        </Card>
      ) : <>
        {preview.isPending && <p role="status">Loading invite…</p>}
        {failure && <div className="stack-sm" role="alert">
          <p>{failure.message}</p>
          {error instanceof ApiError && error.status === 401
            ? <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>
            : failure.retry && <Button className="self-start" disabled={preview.isFetching || join.isPending}
                onClick={() => { join.reset(); void preview.refetch() }}>Try again</Button>}
        </div>}
        {habit && !preview.error && <Card className="stack-md">
          <h2 className="text-h2">{habit.name}</h2>
          <p>{goalSentence({ name: habit.name, targetCount: habit.target_count,
            intervalCount: habit.interval_count, intervalUnit: habit.interval_unit, numPeriods: habit.num_periods })}</p>
          <dl className="confirm-summary">
            <div><dt>Starts</dt><dd>{formatDate(habit.start_date)}</dd></div>
            <div><dt>Invited by</dt><dd>{habit.owner_display_name ?? "Your friend"}</dd></div>
            <div><dt>Places left</dt><dd>{habit.places_left}</dd></div>
          </dl>
          <p>Other members will see your display name when you join.</p>
          {habit.places_left === 0 && !failure && <p role="status">This shared habit is full. There are no places left.</p>}
          <Button className="self-start" disabled={join.isPending || preview.isFetching || habit.places_left === 0 || Boolean(failure)}
            onClick={handleJoin}>{join.isPending ? "Joining…" : "Join"}</Button>
        </Card>}
      </>}
      <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>
    </main>
  )
}
