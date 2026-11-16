// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Login from "./Login"
import { SCENE_PLANTS } from "./login/scene/plants"

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
  signInWithGoogle: vi.fn(),
}))
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }))

// The first test loads the dev tools, which can take several seconds the first time.
vi.setConfig({ testTimeout: 20000 })

const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  auth.user = null
  auth.loading = false
  writeText.mockClear()
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  window.history.pushState({}, "", "/login?dev")
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  window.history.pushState({}, "", "/")
})

// The first load of the dev tools can take a moment, so wait longer than the default.
const panel = () => screen.findByRole("complementary", { name: "Login scene dev tools" }, { timeout: 8000 })
const firstId = SCENE_PLANTS[0].id

describe("login dev tools", () => {
  it("are off without ?dev in the address", () => {
    window.history.pushState({}, "", "/login")
    render(<Login />)
    expect(screen.queryByRole("complementary", { name: "Login scene dev tools" })).toBeNull()
    expect(document.querySelector("[data-label]")).toBeNull()
  })

  it("are never on in a production build, even with ?dev", () => {
    vi.stubEnv("NODE_ENV", "production")
    render(<Login />)
    expect(screen.queryByRole("complementary", { name: "Login scene dev tools" })).toBeNull()
    expect(document.querySelector("[data-label]")).toBeNull()
  })

  it("label every plant, and the labels can be turned off", async () => {
    render(<Login />)
    const tools = await panel()
    expect(document.querySelectorAll("[data-label]").length).toBe(SCENE_PLANTS.length)
    expect(document.querySelector('[data-label="' + firstId + '"]')?.textContent).toContain(firstId)
    fireEvent.click(within(tools).getByRole("checkbox", { name: "Plant labels" }))
    expect(document.querySelectorAll("[data-label]").length).toBe(0)
  })

  it("show the guides only when asked", async () => {
    render(<Login />)
    const tools = await panel()
    expect(document.querySelector("[data-dev-layer] polygon")).toBeNull()
    fireEvent.click(within(tools).getByRole("checkbox", { name: "Shelf boards" }))
    expect(document.querySelectorAll("[data-dev-layer] polygon").length).toBeGreaterThanOrEqual(2)
    fireEvent.click(within(tools).getByRole("checkbox", { name: "Text area" }))
    expect(document.body.textContent).toContain("text area: no plants")
  })

  it("hide the sunlight and the words when asked", async () => {
    render(<Login />)
    const tools = await panel()
    const before = document.querySelectorAll("svg.login__scene g[style*='screen']").length
    expect(before).toBe(1)
    fireEvent.click(within(tools).getByRole("checkbox", { name: "Sunlight" }))
    expect(document.querySelectorAll("svg.login__scene g[style*='screen']").length).toBe(0)
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy()
    fireEvent.click(within(tools).getByRole("checkbox", { name: "Hide the words" }))
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
  })

  it("select a plant when it is clicked, and show its controls", async () => {
    render(<Login />)
    const tools = await panel()
    expect(within(tools).getByText("No plant selected.")).toBeTruthy()
    fireEvent.click(document.querySelector('[data-plant-box="' + firstId + '"]') as Element)
    const editor = await within(tools).findByRole("group", { name: "Edit " + firstId })
    expect((within(editor).getByLabelText("Type") as HTMLSelectElement).value).toBe(SCENE_PLANTS[0].type)
    expect((within(editor).getByLabelText("Stage") as HTMLSelectElement).value).toBe(String(SCENE_PLANTS[0].stage))
  })

  it("change a plant live: its label and its copied line follow the edits", async () => {
    render(<Login />)
    const tools = await panel()
    fireEvent.click(document.querySelector('[data-plant-box="' + firstId + '"]') as Element)
    const editor = await within(tools).findByRole("group", { name: "Edit " + firstId })

    fireEvent.change(within(editor).getByLabelText("Stage"), { target: { value: "2" } })
    fireEvent.change(within(editor).getByLabelText("Type"), { target: { value: "rose" } })
    fireEvent.change(within(editor).getByLabelText("Size"), { target: { value: "200" } })
    fireEvent.change(within(editor).getByLabelText("Pot color"), { target: { value: "navy" } })
    fireEvent.change(within(editor).getByLabelText("Pot band"), { target: { value: "none" } })

    const label = document.querySelector('[data-label="' + firstId + '"]')?.textContent ?? ""
    expect(label).toContain("rose s2")
    expect(label).toContain("200u")

    fireEvent.click(within(editor).getByRole("button", { name: "Copy this line" }))
    expect(writeText).toHaveBeenCalledTimes(1)
    const line = writeText.mock.calls[0][0] as string
    expect(line).toContain('id: "' + firstId + '"')
    expect(line).toContain('type: "rose"')
    expect(line).toContain("stage: 2")
    expect(line).toContain("size: 200")
    expect(line).toContain('pot: { color: "navy", band: "none" }')
    expect(await within(tools).findByText("Copied the line for " + firstId + ".")).toBeTruthy()
  })

  it("clear the pot choices back to the seed", async () => {
    render(<Login />)
    const tools = await panel()
    fireEvent.click(document.querySelector('[data-plant-box="' + firstId + '"]') as Element)
    const editor = await within(tools).findByRole("group", { name: "Edit " + firstId })
    fireEvent.change(within(editor).getByLabelText("Pot color"), { target: { value: "navy" } })
    fireEvent.change(within(editor).getByLabelText("Pot color"), { target: { value: "" } })
    fireEvent.change(within(editor).getByLabelText("Pot band"), { target: { value: "" } })
    fireEvent.click(within(editor).getByRole("button", { name: "Copy this line" }))
    expect(writeText.mock.calls[0][0]).not.toContain("pot:")
  })

  it("nudge the selected plant with the arrow keys, ten at a time with Shift", async () => {
    render(<Login />)
    const tools = await panel()
    fireEvent.click(document.querySelector('[data-plant-box="' + firstId + '"]') as Element)
    await within(tools).findByRole("group", { name: "Edit " + firstId })
    const { x, y } = SCENE_PLANTS[0]
    fireEvent.keyDown(window, { key: "ArrowRight" })
    fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true })
    fireEvent.click(within(tools).getByRole("button", { name: "Copy this line" }))
    const line = writeText.mock.calls[0][0] as string
    expect(line).toContain("x: " + (x + 1))
    expect(line).toContain("y: " + (y + 10))
  })

  it("keep the arrow keys for a form field the user is typing in", async () => {
    render(<Login />)
    const tools = await panel()
    fireEvent.click(document.querySelector('[data-plant-box="' + firstId + '"]') as Element)
    const editor = await within(tools).findByRole("group", { name: "Edit " + firstId })
    fireEvent.keyDown(within(editor).getByLabelText("Size"), { key: "ArrowRight" })
    fireEvent.click(within(editor).getByRole("button", { name: "Copy this line" }))
    expect(writeText.mock.calls[0][0]).toContain("x: " + SCENE_PLANTS[0].x + ",")
  })

  it("reset one plant or all of them, and let Escape deselect", async () => {
    render(<Login />)
    const tools = await panel()
    fireEvent.click(document.querySelector('[data-plant-box="' + firstId + '"]') as Element)
    const editor = await within(tools).findByRole("group", { name: "Edit " + firstId })
    fireEvent.change(within(editor).getByLabelText("Stage"), { target: { value: "1" } })
    fireEvent.click(within(editor).getByRole("button", { name: "Reset" }))
    expect((within(tools).getByLabelText("Stage") as HTMLSelectElement).value).toBe(String(SCENE_PLANTS[0].stage))

    fireEvent.change(within(tools).getByLabelText("Stage"), { target: { value: "1" } })
    fireEvent.click(within(tools).getByRole("button", { name: "Reset all" }))
    expect((within(tools).getByLabelText("Stage") as HTMLSelectElement).value).toBe(String(SCENE_PLANTS[0].stage))

    fireEvent.keyDown(window, { key: "Escape" })
    expect(within(tools).getByText("No plant selected.")).toBeTruthy()
  })

  it("copy every plant's line at once", async () => {
    render(<Login />)
    const tools = await panel()
    fireEvent.click(within(tools).getByRole("button", { name: "Copy all lines" }))
    const text = writeText.mock.calls[0][0] as string
    expect(text.split("\n").length).toBe(SCENE_PLANTS.length)
  })

  it("warn about a problem the moment an edit causes one", async () => {
    render(<Login />)
    const tools = await panel()
    expect(within(tools).queryByRole("alert")).toBeNull()
    fireEvent.click(document.querySelector('[data-plant-box="' + firstId + '"]') as Element)
    const editor = await within(tools).findByRole("group", { name: "Edit " + firstId })
    // The first plants rests on the upper back shelf. Moving it far down takes it off the shelf.
    fireEvent.change(within(editor).getByLabelText("y"), { target: { value: "600" } })
    const alert = await within(tools).findByRole("alert")
    expect(alert.textContent).toContain(firstId + ": its pot is not on the back-upper shelf")
  })
})
