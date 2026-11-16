"use client"

import { useSyncExternalStore } from "react"

// The address does not change while the login screen is open, so there is nothing to listen to.
const subscribe = () => () => {}

/** In the browser: development only, and only when the address has "?dev". */
const read = () => process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("dev")

/**
 * Whether the login screen's dev tools are on. The server always says no, and
 * the browser reads the address after hydration, so the first draw matches. A
 * production build never turns it on.
 */
export function useDevMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
