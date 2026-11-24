"use client"

import { useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { UserRound } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { useBadgeNotifier } from "@/components/BadgeNotifier"
import { Button } from "@/components/Button"
import { ApiError } from "@/lib/api"
import { profileKeys, profileWithToday, updateDisplayName, type Profile } from "@/lib/profile"
import { sharedHabitKeys } from "@/lib/sharedHabits"

export function ProfileDetails({ profile }: { profile: Profile }) {
  const { user, signOut } = useAuth()
  const client = useQueryClient()
  const badges = useBadgeNotifier()
  const [draft, setDraft] = useState<string | null>(null)
  const [validationError, setValidationError] = useState("")
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null)
  const writing = useRef(false)
  const name = draft ?? profile.display_name
  const email = profile.email ?? user?.email
  const save = useMutation({
    mutationFn: updateDisplayName,
    scope: { id: `profile:${user?.id ?? "signed-out"}` },
    retry: false,
    onMutate: async () => {
      if (user) await client.cancelQueries({ queryKey: profileKeys.user(user.id) })
    },
    onSuccess: ({ new_badges, ...updated }) => {
      badges.push(new_badges)
      if (user) {
        client.setQueryData(profileKeys.user(user.id), profileWithToday(updated))
        void client.invalidateQueries({ queryKey: sharedHabitKeys.all(user.id) })
        void client.invalidateQueries({ queryKey: ["shared-invite", user.id] })
      }
      setDraft(null)
    },
    onSettled: () => { writing.current = false },
  })
  const unauthorized = save.error instanceof ApiError && save.error.status === 401

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || writing.current || unauthorized) return
    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > 50) {
      setValidationError("Enter a display name between 1 and 50 characters.")
      return
    }
    writing.current = true
    setValidationError("")
    save.mutate(trimmed)
  }

  return <div className="stack-md">
    <div className="row" style={{ gap: "var(--space-4)" }}>
      {profile.avatar_url && failedAvatar !== profile.avatar_url ? (
        <Image src={profile.avatar_url} alt="Your profile photo" width={64} height={64} unoptimized
          style={{ borderRadius: "var(--radius-pill)", objectFit: "cover" }}
          onError={() => setFailedAvatar(profile.avatar_url)} />
      ) : <span role="img" aria-label="Default profile picture" className="center-all"
          style={{ width: 64, height: 64, flexShrink: 0, borderRadius: "var(--radius-pill)", background: "var(--color-surface-secondary)" }}>
          <UserRound size={32} aria-hidden="true" />
        </span>}
      <p className="text-body text-secondary" style={{ overflowWrap: "anywhere" }}>
        {email ? `Signed in as ${email}` : "Email unavailable."}
      </p>
    </div>
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor="settings-display-name">Display name</label>
        <p id="display-name-help" className="field__hint">Other members see this name in shared habits. Use 1–50 characters.</p>
        <input id="settings-display-name" className="input" value={name} required autoComplete="nickname"
          disabled={save.isPending || unauthorized} aria-invalid={Boolean(validationError)}
          aria-describedby={`display-name-help${validationError ? " display-name-error" : ""}`}
          onChange={(event) => { setDraft(event.target.value); setValidationError(""); save.reset() }} />
        {validationError && <p role="alert" id="display-name-error" className="field__error">{validationError}</p>}
      </div>
      {save.isError && <div role="alert" className="stack-sm">
        <p className="form-error">{unauthorized ? "Your session has expired. Sign in again to continue."
          : save.error instanceof ApiError && save.error.status === 400 ? "That display name wasn't accepted. Use 1–50 characters and try again."
            : "Couldn't save your display name. Check your connection and try again."}</p>
        {unauthorized && <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>}
      </div>}
      {save.isSuccess && <p role="status">Display name saved.</p>}
      <Button type="submit" className="self-start" disabled={!user || save.isPending || unauthorized}>
        {save.isPending ? "Saving display name…" : "Save display name"}
      </Button>
    </form>
  </div>
}
