"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { ApiError } from "@/lib/api"
import { deleteHabit, habitKeys } from "@/lib/habits"
import { Button } from "./Button"
import { Modal } from "./Modal"

/**
 * Delete a habit, after one confirmation. A habit cannot be edited, so deleting
 * it and creating a new one is how a user changes it. Its logs go with it.
 */
export function DeleteHabit({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false)

  return (
    <section aria-label="Delete habit" className="stack-sm">
      <p className="text-body text-secondary">
        A habit can&apos;t be edited. To change it, delete it and create a new one.
      </p>
      <Button variant="danger" className="self-start" onClick={() => setOpen(true)}>Delete habit</Button>
      <DeleteHabitDialog id={id} name={name} open={open} onClose={() => setOpen(false)} />
    </section>
  )
}

/** The confirmation on its own, for places that have their own Delete habit button. */
export function DeleteHabitDialog({ id, name, open, onClose }: {
  id: string
  name: string
  open: boolean
  onClose: () => void
}) {
  const { user, signOut } = useAuth()
  const client = useQueryClient()
  const router = useRouter()

  const remove = useMutation({
    mutationFn: async () => {
      try {
        await deleteHabit(id)
      } catch (error) {
        // Already gone (for example deleted in another tab): the goal is met.
        if (!(error instanceof ApiError && error.status === 404)) throw error
      }
    },
    onSuccess: async () => {
      if (user) {
        // Stop this page asking for a habit that no longer exists, then refresh every list.
        await client.cancelQueries({ queryKey: habitKeys.detail(user.id, id) })
        client.removeQueries({ queryKey: habitKeys.detail(user.id, id) })
        void client.invalidateQueries({ queryKey: habitKeys.all(user.id) })
      }
      onClose()
      router.replace("/")
    },
  })

  function close() {
    if (remove.isPending) return
    onClose()
    remove.reset()
  }

  const unauthorized = remove.error instanceof ApiError && remove.error.status === 401

  return (
    <Modal open={open} onClose={close} title="Delete this habit?"
      description={`“${name}” and all of its activity will be deleted. This can't be undone.`}>
      <div className="stack-md">
        {remove.isError && (
          <div role="alert" className="stack-sm">
            <p className="form-error">
              {unauthorized
                ? "Your session has expired. Sign in again to continue."
                : "Couldn't delete this habit. Check your connection and try again."}
            </p>
            {unauthorized && <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={close} disabled={remove.isPending}>Cancel</Button>
          <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending || unauthorized}>
            {remove.isPending ? "Deleting…" : "Delete habit"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
