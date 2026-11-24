"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Modal } from "@/components/Modal"
import { ApiError } from "@/lib/api"
import {
  closeSharedJoining, deleteSharedHabit, leaveSharedHabit, regenerateSharedInvite,
  removeSharedMember, sharedHabitKeys, transferSharedOwnership, type SharedHabitDetail,
} from "@/lib/sharedHabits"

type Action =
  | { kind: "leave" | "delete" | "regenerate" | "close" }
  | { kind: "remove" | "transfer"; userId: string; name: string }

function confirmation(action: Action, name: string) {
  switch (action.kind) {
    case "leave": return { title: "Leave this shared habit?", label: "Leave habit", pending: "Leaving…",
      description: `You will leave “${name}” and lose access. Your past logs stay saved, but you will no longer count toward the group's progress and health.` }
    case "delete": return { title: "Delete this shared habit?", label: "Delete shared habit", pending: "Deleting…",
      description: `“${name}” and every member's activity will be deleted for everyone. This can't be undone.` }
    case "remove": return { title: `Remove ${action.name}?`, label: "Remove member", pending: "Removing…",
      description: `${action.name} will lose access to “${name}”. Their past logs stay saved, but they will no longer count toward the group's progress and health.` }
    case "transfer": return { title: `Transfer ownership to ${action.name}?`, label: "Transfer ownership", pending: "Transferring…",
      description: `${action.name} will manage “${name}”, including its members, invite link and deletion. You will remain a regular member and can then leave.` }
    case "regenerate": return { title: "Replace the invite link?", label: "Get a new link", pending: "Replacing…",
      description: "The old invite link will stop working. Existing members stay in the habit. Share the new link with anyone who has not joined yet." }
    case "close": return { title: "Close joining?", label: "Close joining", pending: "Closing…",
      description: "The invite link will stop working. Existing members stay. You can get a new link before any member reaches the start date." }
  }
}

/** Management stays separate from logging. Authorization and date limits are enforced by the backend. */
export function SharedHabitActions({ habit, userId, busy = false }: { habit: SharedHabitDetail; userId: string; busy?: boolean }) {
  const { signOut } = useAuth()
  const client = useQueryClient()
  const router = useRouter()
  const submitting = useRef(false)
  const [action, setAction] = useState<Action | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [notice, setNotice] = useState("")
  const owner = habit.owner_id === userId
  const others = habit.members.filter((member) => member.user_id !== userId)
  const selected = others.find((member) => member.user_id === selectedId)
  // Other members' timezones and the permanent start lock are private. If either
  // makes a request unavailable sooner, the backend returns a state error below.
  const inviteLocked = habit.own_today >= habit.start_date || habit.stats.state !== "not_started"
  const detailKey = sharedHabitKeys.detail(userId, habit.id)

  const mutation = useMutation({
    onMutate: () => client.cancelQueries({ queryKey: detailKey }),
    mutationFn: async (request: Action) => {
      switch (request.kind) {
        case "leave": return leaveSharedHabit(habit.id)
        case "delete": return deleteSharedHabit(habit.id)
        case "remove": return removeSharedMember(habit.id, request.userId)
        case "transfer": return transferSharedOwnership(habit.id, request.userId)
        case "close": return closeSharedJoining(habit.id)
        case "regenerate": return regenerateSharedInvite(habit.id)
      }
    },
    onSuccess: async (result, request) => {
      if (request.kind === "leave" || request.kind === "delete") {
        // Stop polling and discard private details as soon as access is gone.
        await client.cancelQueries({ queryKey: detailKey })
        client.removeQueries({ queryKey: detailKey })
        void client.invalidateQueries({ queryKey: sharedHabitKeys.all(userId) })
        void client.invalidateQueries({ queryKey: ["shared-invite", userId] })
        router.replace("/")
        return
      }
      // Apply confirmed changes before refetching. In particular, an old owner
      // must lose their controls even if the following refresh is offline.
      client.setQueryData<SharedHabitDetail>(detailKey, (old) => {
        if (!old) return old
        if (request.kind === "transfer") return {
          ...old, owner_id: request.userId,
          members: old.members.map((member) => ({ ...member, is_owner: member.user_id === request.userId })),
        }
        if (request.kind === "close") return { ...old, join_code: null }
        if (request.kind === "regenerate" && result) return { ...old, join_code: result.join_code }
        return old
      })
      setAction(null)
      setNotice(request.kind === "remove" ? "Member removed."
        : request.kind === "transfer" ? "Ownership transferred. You are now a regular member."
        : request.kind === "close" ? "Joining closed." : "Invite link replaced. Copy the new link from Invite friends.")
      void client.invalidateQueries({ queryKey: ["shared-invite", userId] })
      // Removal changes group averages; always read those calculations from the server.
      await client.invalidateQueries({ queryKey: sharedHabitKeys.all(userId) })
    },
    onError: (error) => {
      if (error instanceof ApiError && [403, 404].includes(error.status)) {
        void client.invalidateQueries({ queryKey: sharedHabitKeys.all(userId) })
      }
    },
    onSettled: () => { submitting.current = false },
  })

  function open(request: Action) {
    mutation.reset()
    setNotice("")
    setAction(request)
  }
  function close() {
    if (submitting.current) return
    setAction(null)
    mutation.reset()
  }
  function confirm() {
    if (!action || submitting.current || busy) return
    submitting.current = true
    mutation.mutate(action)
  }
  const disabled = busy || mutation.isPending
  const text = action ? confirmation(action, habit.name) : null
  const status = mutation.error instanceof ApiError ? mutation.error.status : undefined
  const errorMessage = status === 401 ? "Your session has expired. Sign in again to continue."
    : status === 403 ? "Your permissions have changed. Only the current owner can do this."
    : status === 404 ? "This habit or member is no longer available. Refresh the page to see the latest details."
    : status === 400 && (action?.kind === "regenerate" || action?.kind === "close")
      ? "Invite links can no longer be changed. A member may have reached the start date."
    : status === 400 ? "This action is no longer available. Refresh the page to check its current members and owner."
    : "Couldn't save this change. Check your connection and try again."

  return <section className="habit-card stack-md" aria-labelledby="shared-actions-heading">
    <h2 id="shared-actions-heading" className="text-h3">Manage shared habit</h2>
    {owner ? <>
      {others.length > 0 ? <div className="stack-sm">
        <label htmlFor="shared-member" className="field__label">Member to manage</label>
        <select id="shared-member" className="select" value={selected?.user_id ?? ""}
          disabled={disabled} onChange={(event) => setSelectedId(event.target.value)}>
          <option value="">Choose a member</option>
          {others.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name ?? "Garden member"}</option>)}
        </select>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={disabled || !selected} onClick={() => selected && open({ kind: "transfer", userId: selected.user_id, name: selected.display_name ?? "Garden member" })}>Transfer ownership</Button>
          <Button variant="danger" disabled={disabled || !selected} onClick={() => selected && open({ kind: "remove", userId: selected.user_id, name: selected.display_name ?? "Garden member" })}>Remove member</Button>
        </div>
      </div> : <p>You&apos;re the only member. Invite a friend before transferring ownership.</p>}
      <p className="text-body-sm text-secondary">To leave, transfer ownership to another member first.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={disabled || inviteLocked} onClick={() => open({ kind: "regenerate" })}>Get a new link</Button>
        {habit.join_code && <Button variant="secondary" disabled={disabled || inviteLocked} onClick={() => open({ kind: "close" })}>Close joining</Button>}
      </div>
      <p className="text-body-sm text-secondary">Invite links can only be changed before any member reaches the start date.</p>
      <Button variant="danger" className="self-start" disabled={disabled} onClick={() => open({ kind: "delete" })}>Delete shared habit</Button>
    </> : <Button variant="secondary" className="self-start" disabled={disabled} onClick={() => open({ kind: "leave" })}>Leave habit</Button>}
    {notice && <p role="status">{notice}</p>}
    <Modal open={Boolean(action)} onClose={close} title={text?.title ?? "Confirm change"} description={text?.description}>
      {text && <div className="stack-md">
        {mutation.isError && <div role="alert" className="stack-sm">
          <p className="form-error">{errorMessage}</p>
          {status === 401 && <Button onClick={() => void signOut()}>Sign in again</Button>}
        </div>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={close} disabled={mutation.isPending}>Cancel</Button>
          <Button variant={action?.kind === "transfer" || action?.kind === "regenerate" ? "primary" : "danger"}
            onClick={confirm} disabled={disabled || status === 401 || status === 403 || status === 404}>
            {mutation.isPending ? text.pending : text.label}
          </Button>
        </div>
      </div>}
    </Modal>
  </section>
}
