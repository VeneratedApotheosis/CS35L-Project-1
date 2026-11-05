import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getSession = vi.fn()
vi.mock("./supabase", () => ({
  supabase: { auth: { getSession: () => getSession() } },
}))

const fetchMock = vi.fn()

async function loadApi() {
  vi.resetModules()
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return import("./api")
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  getSession.mockResolvedValue({ data: { session: { access_token: "tok-123" } } })
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe("api.post", () => {
  it("sends the bearer token and a JSON body to NEXT_PUBLIC_API_URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: "h1" }))
    const { api } = await loadApi()

    const result = await api.post("/habits", { name: "Run" })

    expect(result).toEqual({ id: "h1" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("http://api.test/habits")
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer tok-123",
    })
    expect(JSON.parse(init.body)).toEqual({ name: "Run" })
  })

  it("parses the { error: { code, message } } envelope into an ApiError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: { code: "validation", message: "bad name" } }),
    )
    const { api, ApiError } = await loadApi()

    const err = await api.post("/habits", {}).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 400, code: "validation", message: "bad name" })
  })

  it("turns a network failure into a network ApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    const { api, ApiError } = await loadApi()

    const err = await api.post("/habits", {}).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 0, code: "network" })
  })

  it("gives a generic error when the failing response is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>oops</html>", { status: 502 }))
    const { api, ApiError } = await loadApi()

    const err = await api.post("/habits", {}).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({
      status: 502,
      code: "error",
      message: "Something went wrong. Try again.",
    })
  })

  it("throws a 401 ApiError without calling fetch when there is no session", async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const { api, ApiError } = await loadApi()

    const err = await api.post("/habits", {}).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 401, code: "unauthorized" })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})