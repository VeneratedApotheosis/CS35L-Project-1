import { afterEach, expect, it, vi } from "vitest"
import { habitHref, sharedInviteUrl } from "./paths"

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

it("puts the habit id in the query string", () => {
  expect(habitHref("abc-123")).toBe("/habit?id=abc-123")
})

it("escapes an id that has special characters", () => {
  expect(habitHref("a b&c")).toBe("/habit?id=a%20b%26c")
})

it("builds an absolute static-compatible invite URL and escapes the code", () => {
  expect(sharedInviteUrl("https://garden.test", "a b&c")).toBe("https://garden.test/join?code=a%20b%26c")
})

it("includes the GitHub Pages base path in copied invitations", async () => {
  vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/CS35L-Project-1")
  vi.resetModules()
  const paths = await import("./paths")
  expect(paths.sharedInviteUrl("https://example.github.io", "abc123")).toBe(
    "https://example.github.io/CS35L-Project-1/join?code=abc123",
  )
})
