"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/auth/useAuth"

// Placeholder login
export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace("/")
  }, [loading, user, router])

  if (loading || user) return null

  return (
    <main>
      <h1>Habit Garden</h1>
      <button type="button" onClick={() => void signInWithGoogle()}>
        Sign in with Google
      </button>
    </main>
  )
}
