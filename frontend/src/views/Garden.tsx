"use client"

import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"

// Placeholder home page
export default function Garden() {
  const { user, signOut } = useAuth()

  return (
    <main className="stack-lg">
      <h1 className="text-h1">My Garden</h1>
      <p className="text-body text-secondary">Signed in as {user?.email}</p>
      <Button variant="secondary" className="self-start" onClick={() => void signOut()}>
        Sign out
      </Button>
    </main>
  )
}
