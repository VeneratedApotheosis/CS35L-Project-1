import { supabase } from "./supabase"

// Base URL of the Express backend, e.g. http://localhost:3000.
const API_URL = process.env.NEXT_PUBLIC_API_URL

/** The error envelope the backend returns: { error: { code, message } }. */
export interface ApiErrorShape {
  code: string
  message: string
}

/** Thrown when a request fails or the backend returns an error envelope. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      0,
      "config",
      "Missing NEXT_PUBLIC_API_URL in frontend/.env.local",
    )
  }

  // Read the token at call time so it is always current.
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new ApiError(
      401,
      "unauthorized",
      "You are signed out. Sign in and try again.",
    )
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError(
      0,
      "network",
      "Couldn't reach the server. Check your connection and try again.",
    )
  }

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const err = (body as { error?: ApiErrorShape } | null)?.error
    throw new ApiError(
      res.status,
      err?.code ?? "error",
      err?.message ?? "Something went wrong. Try again.",
    )
  }

  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, json: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(json) }),
  patch: <T>(path: string, json: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(json) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
