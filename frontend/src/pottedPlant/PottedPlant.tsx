"use client"

import { useId, type ReactNode } from "react"
import { VIEWBOX } from "./genome"
import { Pot, type PotLook } from "./pots"

export interface PottedPlantProps {
  /** How the pot looks. Any look goes with any plant. */
  look: PotLook
  /** Scales the pot's decoration only. The pot keeps its shape. */
  potSize?: number
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: nothing inside the picture moves.
   */
  scale?: number
  className?: string
  title: string
  /** The bare plant drawing, such as PothosDrawing. It is drawn on top of the pot. */
  children: ReactNode
}

/**
 * One potted plant picture: the shared canvas, the pot first, then the plant
 * in front of it. The plant and the pot know nothing about each other beyond
 * the pot's geometry, so this is the only place they are combined.
 */
export function PottedPlant({ look, potSize, scale, className, title, children }: PottedPlantProps) {
  const id = useId().replace(/:/g, "")

  return (
    <svg
      viewBox={VIEWBOX}
      overflow="visible"
      role="img"
      aria-label={title}
      className={className}
      style={scale === undefined ? undefined : { width: scale * 100 + "%" }}
    >
      <Pot look={look} size={potSize} id={id} />
      {children}
    </svg>
  )
}
