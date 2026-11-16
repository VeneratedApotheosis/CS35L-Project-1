"use client"

import { lazy, Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sprout } from "lucide-react"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { GoogleIcon } from "./login/GoogleIcon"
import { LoginScene } from "./login/scene/LoginScene"
import { useDevMode } from "./login/scene/dev/useDevMode"

// The dev tools load only when they are asked for, so a normal visit never downloads them.
const DevScene = lazy(() => import("./login/scene/dev/DevScene"))

/**
 * The login screen: a greenhouse fills the screen, and the words sit straight
 * on it, with no cards. The page is always the daytime scene, so it uses the
 * light theme whatever the app's theme is.
 */
export default function Login() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const dev = useDevMode()
  const [hideText, setHideText] = useState(false)

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

  // The picture shows at once, so the page is never blank. The words wait for the sign-in state.
  const ready = !authLoading && !user

  return (
    <main className="login" data-theme="light">
      {/* Decorative: the words on the page say everything the picture does. */}
      {dev ? (
        <Suspense fallback={<LoginScene />}>
          <DevScene hideText={hideText} onHideText={setHideText} />
        </Suspense>
      ) : (
        <LoginScene />
      )}
      <div className="login__haze" aria-hidden="true" />
      {ready && !(dev && hideText) && <LoginWords pending={pending} error={error} onSignIn={() => void handleSignIn()} />}
    </main>
  )
}

/** The logo, the title and description, and the sign-in button, straight on the picture. */
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
