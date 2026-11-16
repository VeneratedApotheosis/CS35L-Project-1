"use client"

import { createContext, useContext, type ReactNode } from "react"

const ShrinkContext = createContext<number | null>(null)

/**
 * Makes every staged plant drawn inside it animate a move DOWN a stage: the
 * leaves it keeps slide back to their smaller places and the extra leaves shrink
 * into the soil, over the given number of seconds. Without it a plant that moves down a stage just
 * changes at once, as it always has. Put it around a plant's component, so the
 * species files don't each need to pass the time down.
 */
export function ShrinkProvider({ seconds, children }: { seconds: number; children: ReactNode }) {
  return <ShrinkContext.Provider value={seconds}>{children}</ShrinkContext.Provider>
}

/** The time set by the nearest ShrinkProvider, in seconds, or null when moving down a stage is not animated. */
export const useShrinkSeconds = () => useContext(ShrinkContext)
