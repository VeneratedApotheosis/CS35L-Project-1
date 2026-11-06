"use client"

import type { ComponentType } from "react"
import { Pothos } from "./pothos/Pothos"
import { PeaceLily } from "./peaceLily"
import { Pilea } from "./pilea"
import { SnakePlant } from "./snakePlant"
import { KimberlyQueen } from "./kimberlyQueen"
import { Lily } from "./lily"
import { Rose } from "./rose"
import { Monstera } from "./monstera"
import { Philodendron } from "./philodendron"
import { Lotus } from "./lotus"

/**
 * The plant types the create-habit form offers. This is the single source of
 * truth for the list: the picker, the preview and the value stored on the habit
 * all come from here.
 *
 * The `id` is sent to the backend as `plant_type` and the backend validates it,
 * so this list must match the backend's accepted list exactly. The source of
 * truth is `PLANT_TYPES` in backend/src/domain/plants.ts.
 */

export interface PlantPreviewProps {
  seed?: number
  stage?: 1 | 2 | 3 | 4
}

export interface PlantType {
  id: string
  label: string
  /** One short line shown under the name in the picker. */
  blurb: string
  Preview: ComponentType<PlantPreviewProps>
}

/** A stable seed so every preview of a type looks the same. */
const PREVIEW_SEED = 42

export const PLANT_TYPES = [
  {
    id: "pothos",
    label: "Pothos",
    blurb: "Heart-shaped leaves that trail as it grows.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <Pothos seed={seed} stage={stage} stages={4} />,
  },
  {
    id: "peace_lily",
    label: "Peace lily",
    blurb: "Pointed leaves with white blooms at full growth.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <PeaceLily seed={seed} stage={stage} stages={4} />,
  },
  {
    id: "pilea",
    label: "Pilea",
    blurb: "Round coin leaves on thin stalks.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <Pilea seed={seed} stage={stage} />,
  },
  {
    id: "snake_plant",
    label: "Snake plant",
    blurb: "Tall, upright sword leaves with pale edges.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <SnakePlant seed={seed} stage={stage} stages={4} />,
  },
  {
    id: "kimberly_queen",
    label: "Kimberly Queen",
    blurb: "Arching fern fronds in an upright crown.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <KimberlyQueen seed={seed} stage={stage} stages={4} />,
  },
  {
    id: "lily",
    label: "Lily",
    blurb: "Fanned leaves with star-shaped blooms.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <Lily seed={seed} stage={stage} stages={4} />,
  },
  {
    id: "rose",
    label: "Rose",
    blurb: "Rounded leaves with layered red blooms.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <Rose seed={seed} stage={stage} stages={4} />,
  },
  {
    id: "monstera",
    label: "Monstera",
    blurb: "Big, glossy leaves with natural holes.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <Monstera seed={seed} stage={stage} stages={4} />,
  },
  {
    id: "philodendron",
    label: "Philodendron",
    blurb: "Broad paddle leaves on red stems.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <Philodendron seed={seed} stage={stage} stages={4} />,
  },
  {
    id: "lotus",
    label: "Lotus",
    blurb: "Floating pads and pink flowers on water.",
    Preview: ({ seed = PREVIEW_SEED, stage = 4 }) => <Lotus seed={seed} stage={stage} />,
  },
] as const satisfies readonly PlantType[]

/** Every plant id, derived from the list above. */
export type PlantTypeId = (typeof PLANT_TYPES)[number]["id"]

export const DEFAULT_PLANT_TYPE: PlantTypeId = PLANT_TYPES[0].id

export function plantTypeById(id: string): PlantType | undefined {
  return PLANT_TYPES.find((p) => p.id === id)
}
