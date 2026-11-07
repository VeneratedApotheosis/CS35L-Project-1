"use client"

import { useState, type FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { habitKeys } from "@/lib/habits"
import { isValidTimezone, profileKeys, profileWithToday, updateTimezone } from "@/lib/profile"
import { useProfile } from "@/lib/useProfile"

export default function Settings() {
  const { user, signOut } = useAuth()
  const profile = useProfile()
  const client = useQueryClient()
  const [draft, setDraft] = useState<string | null>(null)
  const [validationError, setValidationError] = useState("")
  const timezone = draft ?? profile.data?.timezone ?? ""
  const save = useMutation({
    mutationFn: updateTimezone,
    onMutate: async () => {
      if (user) await client.cancelQueries({ queryKey: profileKeys.user(user.id) })
    },
    onSuccess: (updated) => {
      if (user) {
        client.setQueryData(profileKeys.user(user.id), profileWithToday(updated))
        void client.invalidateQueries({ queryKey: habitKeys.all(user.id) })
      }
      setDraft(null)
    },
  })
  const timezoneOptions = typeof Intl.supportedValuesOf === "function"
    ? ["UTC", ...Intl.supportedValuesOf("timeZone")]
    : ["UTC", "America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Tokyo"]

  function submit(event: FormEvent) {
    event.preventDefault()
    if (save.isPending) return
    const selected = timezone.trim()
    if (!isValidTimezone(selected)) {
      setValidationError("Choose a valid timezone, such as America/Los_Angeles.")
      return
    }
    setValidationError("")
    save.mutate(selected)
  }

  const unauthorized = save.error instanceof ApiError && save.error.status === 401
  const saveError = save.error instanceof ApiError && save.error.status === 400
    ? "That timezone wasn't accepted. Choose another timezone and try again."
    : "Couldn't save your timezone. Check your connection and try again."

  return (
    <main className="stack-lg">
      <h1 className="text-h1">Settings</h1>
      {profile.isPending ? (
        <p role="status" className="text-body text-secondary">Loading your settings…</p>
      ) : !profile.data ? (
        <div className="stack-md">
          <p role="alert">Couldn&apos;t load your settings. Check your connection and try again.</p>
          <Button className="self-start" onClick={() => void profile.refetch()} disabled={profile.isFetching}>Try again</Button>
        </div>
      ) : (
        <Card>
          <form className="form" onSubmit={submit} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="settings-timezone">Timezone</label>
              <p id="timezone-help" className="text-body text-secondary">
                Your timezone determines today and when habit periods begin and end.
                Choose a city in your timezone, such as America/Los_Angeles.
              </p>
              <input id="settings-timezone" className="input" list="timezones" value={timezone}
                disabled={save.isPending} autoComplete="off" spellCheck={false}
                aria-invalid={Boolean(validationError)}
                aria-describedby={`timezone-help${validationError ? " timezone-error" : ""}`}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setValidationError("")
                  save.reset()
                }} />
              <datalist id="timezones">
                {timezoneOptions.map((zone) => <option key={zone} value={zone} />)}
              </datalist>
              {validationError && <p id="timezone-error" className="field__error" role="alert">{validationError}</p>}
            </div>
            {save.isError && (
              <div role="alert" className="stack-sm">
                <p className="form-error">{unauthorized ? "Your session has expired. Sign in again to continue." : saveError}</p>
                {unauthorized && <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>}
              </div>
            )}
            {save.isSuccess && <p role="status" className="text-body">Timezone saved.</p>}
            <Button type="submit" className="self-start" disabled={save.isPending || unauthorized}>
              {save.isPending ? "Saving…" : "Save timezone"}
            </Button>
          </form>
        </Card>
      )}
    </main>
  )
}
