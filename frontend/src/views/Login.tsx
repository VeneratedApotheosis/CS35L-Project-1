"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sprout } from "lucide-react"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { GoogleIcon } from "./login/GoogleIcon"
import { ShelfWall } from "./login/wall/ShelfWall"

/**
 * The login screen: the words take the left third, and potted plants on wooden
 * shelves fill the rest. The pots keep their size and the wall shows fewer of them
 * as the screen narrows; below 39rem it is a single shelf above the words. The
 * screen follows the app's theme.
 */
export default function Login() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && user) router.replace("/")
  }, [authLoading, user, router])

  async function handleSignIn() {
    setPending(true)
    setError("")
    try {
      await signInWithGoogle()
      // Success sends the browser to Google, so the button stays disabled.
    } catch (caught) {
      const reason = caught instanceof Error && caught.message ? " (" + caught.message + ")" : ""
      setError("Google sign-in didn't start" + reason + ". Check your connection and try again.")
      setPending(false)
    }
  }

  // The wall shows at once, so the page is never blank. The words wait for the sign-in state.
  const ready = !authLoading && !user

  return (
    <main className="login">
      <ShelfWall />
      {ready && <LoginWords pending={pending} error={error} onSignIn={() => void handleSignIn()} />}
    </main>
  )
}

/** The logo, the title and description, and the sign-in button. */
function LoginWords({ pending, error, onSignIn }: { pending: boolean; error: string; onSignIn: () => void }) {
  return (
    <>
      <p className="login__brand text-h3">
        <Icon icon={Sprout} size="lg" className="login__logo" />
        Habit Garden
      </p>

      <div className="login__content stack-lg">
        <div className="stack-md">
          <h1 className="login__title text-h1">Grow a little every day.</h1>
          <p className="login__description text-body">
            Each habit you start becomes a plant. Log your progress and watch it grow.
          </p>
        </div>

        <div className="stack-md">
          <Button variant="secondary" size="lg" onClick={onSignIn} disabled={pending} aria-busy={pending}>
            <GoogleIcon />
            {pending ? "Connecting to Google…" : "Sign in with Google"}
          </Button>
          {error && <p role="alert" className="login__error text-body-sm">{error}</p>}
        </div>
      </div>
    </>
  )
}
