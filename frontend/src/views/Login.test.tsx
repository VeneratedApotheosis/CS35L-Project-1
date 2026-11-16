// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Login from "./Login"

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
  signInWithGoogle: vi.fn(),
}))
const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

beforeEach(() => {
  auth.user = null
  auth.loading = false
  auth.signInWithGoogle.mockReset()
  router.replace.mockReset()
})
afterEach(cleanup)

describe("Login", () => {
  it("shows the title, the description and a Google button", () => {
    render(<Login />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Grow a little every day.")
    expect(screen.getByText(/Each habit you start becomes a plant/)).toBeTruthy()
    expect(screen.getByRole("button", { name: /Sign in with Google/ })).toBeTruthy()
    expect(screen.getByText("Habit Garden")).toBeTruthy()
  })

  it("has no cards over the picture", () => {
    const { container } = render(<Login />)
    expect(container.querySelector(".card, [class*='card']")).toBeNull()
  })

  it("draws the shelf wall at once, and keeps it out of the accessibility tree", () => {
    auth.loading = true
    const { container } = render(<Login />)
    const wall = container.querySelector(".wall")
    expect(wall).not.toBeNull()
    expect(wall?.getAttribute("aria-hidden")).toBe("true")
    // While the sign-in state loads, the words wait.
    expect(screen.queryByRole("heading")).toBeNull()
  })

  it("draws all eight plants in each of the two layouts", () => {
    const { container } = render(<Login />)
    expect(container.querySelectorAll(".wall__svg--wide [data-plant]").length).toBe(8)
    expect(container.querySelectorAll(".wall__svg--tall [data-plant]").length).toBe(8)
    expect(container.querySelectorAll(".wall__svg--wide [data-shelf]").length).toBe(2)
    expect(container.querySelectorAll(".wall__svg--tall [data-shelf]").length).toBe(3)
  })

  it("starts Google sign-in and disables the button while it connects", async () => {
    auth.signInWithGoogle.mockReturnValue(new Promise(() => {}))
    render(<Login />)
    fireEvent.click(screen.getByRole("button", { name: /Sign in with Google/ }))
    await waitFor(() => expect(screen.getByRole("button", { name: /Connecting to Google/ })).toBeTruthy())
    expect((screen.getByRole("button", { name: /Connecting to Google/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1)
  })

  it("explains a failed sign-in and lets the user try again", async () => {
    auth.signInWithGoogle.mockRejectedValueOnce(new Error("offline"))
    render(<Login />)
    fireEvent.click(screen.getByRole("button", { name: /Sign in with Google/ }))
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Google sign-in didn't start (offline)")
    expect((screen.getByRole("button", { name: /Sign in with Google/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it("sends a signed-in user to the garden", () => {
    auth.user = { id: "u" }
    render(<Login />)
    expect(router.replace).toHaveBeenCalledWith("/")
    expect(screen.queryByRole("heading")).toBeNull()
  })
})
