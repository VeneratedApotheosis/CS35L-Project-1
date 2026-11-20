"use client"

import { useState, type FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Modal } from "@/components/Modal"
import { ApiError } from "@/lib/api"
import { deleteAccount } from "@/lib/profile"

/** The word that has to be typed before the account can be deleted. */
export const CONFIRM_WORD = "DELETE"

/** The Account section of Settings. Other account actions, such as sign out, go here too. */
export function AccountSection() {
  const { user, signOut } = useAuth()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")

  // Signing out ends the session. The signed-in layout then sends the user to the login page.
  const leave = useMutation({ mutationFn: signOut })

  const remove = useMutation({
    mutationFn: async () => {
      await deleteAccount()
      // The account is gone, so the server may refuse to revoke the session. The user is signed out either way.
      await signOut().catch(() => undefined)
    },
    onSuccess: () => {
      // Drop everything cached for the deleted user. The signed-in layout then sends them to the login page.
      client.clear()
    },
  })

  function close() {
    if (remove.isPending) return
    setOpen(false)
    setTyped("")
    remove.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (remove.isPending || typed.trim() !== CONFIRM_WORD) return
    remove.mutate()
  }

  const unauthorized = remove.error instanceof ApiError && remove.error.status === 401
  const confirmed = typed.trim() === CONFIRM_WORD

  return (
    <section aria-labelledby="account-heading" className="stack-md">
      <h2 id="account-heading" className="text-h2">Account</h2>
      <Card>
        <div className="stack-md">
          {user?.email && <p className="text-body text-secondary">Signed in as {user.email}</p>}
          <Button variant="secondary" className="self-start" onClick={() => leave.mutate()} disabled={leave.isPending}>
            {leave.isPending ? "Signing out…" : "Sign out"}
          </Button>
          {leave.isError && <p role="alert" className="form-error">Couldn&apos;t sign out. Try again.</p>}
        </div>
      </Card>
      <Card>
        <div className="stack-md">
          <p className="text-body text-secondary">
            Deleting your account removes your habits and everything you logged. This can&apos;t be undone.
          </p>
          <Button variant="danger" className="self-start" onClick={() => setOpen(true)}>Delete account</Button>
        </div>
      </Card>
      <Modal open={open} onClose={close} title="Delete your account?"
        description="This permanently deletes your account and cannot be undone.">
        <form className="form" onSubmit={submit} noValidate>
          <div className="stack-sm">
            <p className="text-body">These will be deleted:</p>
            <ul className="text-body">
              <li>All of your habits</li>
              <li>All of your activity logs</li>
              <li>Your badges</li>
            </ul>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="delete-account-confirm">
              Type {CONFIRM_WORD} to confirm
            </label>
            <input id="delete-account-confirm" className="input" value={typed} autoComplete="off"
              spellCheck={false} disabled={remove.isPending}
              onChange={(event) => { setTyped(event.target.value); remove.reset() }} />
          </div>
          {remove.isError && (
            <div role="alert" className="stack-sm">
              <p className="form-error">
                {unauthorized
                  ? "Your session has expired. Sign in again to continue."
                  : "Couldn't delete your account. You are still signed in. Check your connection and try again."}
              </p>
              {unauthorized && <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={close} disabled={remove.isPending}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={!confirmed || remove.isPending || unauthorized}>
              {remove.isPending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
