"use client"

import { createContext, useContext, type ReactNode } from "react"

const WiltContext = createContext(0)

/**
 * Wilts every staged plant drawn inside it, by an amount from 0 (healthy) to 1
 * (fully wilted). Put it around a plant's component, so the species files
 * don't each need to pass the amount down. It leaves the pot alone.
 */
export function WiltProvider({ wilt, children }: { wilt: number; children: ReactNode }) {
  return <WiltContext.Provider value={wilt}>{children}</WiltContext.Provider>
}

/** The wilt amount set by the nearest WiltProvider, or 0. */
export const useWilt = () => useContext(WiltContext)
