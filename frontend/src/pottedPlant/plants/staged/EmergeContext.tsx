"use client"

import { createContext, useContext, type ReactNode } from "react"

const EmergeContext = createContext(false)

/**
 * Makes every staged plant that is first drawn inside it grow into being: it starts
 * with no leaves and they grow out of the soil to the plant's stage, with the same
 * animation and bursts as a stage-up. Without it a plant is drawn complete the first
 * time, as it always has been. It only matters when a plant is first drawn; a plant
 * that is already on screen is not changed by it. Put it around a plant's component,
 * so the species files don't each need to pass it down.
 */
export function EmergeProvider({ emerge, children }: { emerge: boolean; children: ReactNode }) {
  return <EmergeContext.Provider value={emerge}>{children}</EmergeContext.Provider>
}

/** Whether the nearest EmergeProvider asks a newly drawn plant to grow into being. */
export const useEmerge = () => useContext(EmergeContext)
