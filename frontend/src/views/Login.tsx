"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sprout } from "lucide-react"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { PeaceLily } from "@/plants/peaceLily"
import { Monstera } from "@/plants/monstera"
import { Pilea } from "@/plants/pilea"
import { Pothos } from "@/plants/pothos"
import { Rose } from "@/plants/rose"

/** Google's brand colors are fixed, so they are not theme tokens. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="login__google-icon" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.4l-3.25-2.52c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.91A6 6 0 0 1 6.07 12c0-.66.12-1.3.32-1.91V7.48H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.52l3.35-2.61Z" />
      <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.89-2.89A9.68 9.68 0 0 0 12 2a10 10 0 0 0-8.96 5.48l3.35 2.61C7.18 7.72 9.39 5.96 12 5.96Z" />
    </svg>
  )
}

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

  if (authLoading || user) return null

  return (
    <main className="login">
      <section className="login__panel">
        <p className="login__brand text-h3">
          <span className="login__logo"><Icon icon={Sprout} size="lg" /></span>
          Habit Garden
        </p>

        <div className="login__content stack-lg">
          <div className="stack-md">
            <h1 className="text-h1">Grow a little every day.</h1>
            <p className="text-body text-secondary login__description">
              Each habit you start becomes a plant. Log your progress and watch it grow.
            </p>
          </div>

          <div className="stack-md">
            <Button variant="secondary" size="lg" full onClick={() => void handleSignIn()}
              disabled={pending} aria-busy={pending}>
              <GoogleIcon />
              {pending ? "Connecting to Google…" : "Sign in with Google"}
            </Button>
            {error && <p role="alert" className="login__error text-body-sm">{error}</p>}
          </div>
        </div>
      </section>

      {/* Decorative: the plants repeat nothing the page says. */}
      <section className="login__garden" aria-hidden="true">
        <div className="login__plants">
          <div className="login__row">
            <div className="login__plant"><PeaceLily seed={2} stage={4} /></div>
            <div className="login__plant"><Pothos seed={1} stage={4} /></div>
            <div className="login__plant"><Rose seed={4} stage={4} /></div>
          </div>
          <div className="login__row login__row--front">
            <div className="login__plant"><Monstera seed={3} stage={4} /></div>
            <div className="login__plant"><Pilea seed={5} stage={4} /></div>
          </div>
        </div>
      </section>
    </main>
  )
}
