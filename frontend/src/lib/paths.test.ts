import { expect, it } from "vitest"
import { habitHref } from "./paths"

it("puts the habit id in the query string", () => {
  expect(habitHref("abc-123")).toBe("/habit?id=abc-123")
})

it("escapes an id that has special characters", () => {
  expect(habitHref("a b&c")).toBe("/habit?id=a%20b%26c")
})
