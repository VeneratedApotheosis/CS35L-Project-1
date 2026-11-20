// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { AuthProvider } from "./AuthProvider"
import { useAuth } from "./useAuth"

const mocks = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/CS35L-Project-1")
  return { signInWithOAuth: vi.fn(), unsubscribe: vi.fn() }
})
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {
  signInWithOAuth: mocks.signInWithOAuth,
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: mocks.unsubscribe } } }),
} } }))

function SignIn({ code }: { code?: string }) {
  const { signInWithGoogle } = useAuth()
  return <button onClick={() => void signInWithGoogle(code)}>Sign in</button>
}
beforeEach(() => mocks.signInWithOAuth.mockResolvedValue({ error: null }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it("returns an invite sign-in to the join page, preserving its code and the deployment base path", async () => {
  render(<AuthProvider><SignIn code={"A".repeat(32)} /></AuthProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
  await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google", options: { redirectTo: `${window.location.origin}/CS35L-Project-1/join?code=${"a".repeat(32)}` },
  }))
})

it.each([undefined, "https://evil.test", "../login"])("keeps ordinary sign-in and invalid invite %j on the original Garden redirect", async (code) => {
  render(<AuthProvider><SignIn code={code} /></AuthProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
  await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google", options: { redirectTo: `${window.location.origin}/CS35L-Project-1` },
  }))
})
