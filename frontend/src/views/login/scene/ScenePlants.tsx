"use client"

import { memo } from "react"
import { Lily } from "@/pottedPlant/plants/lily"
import { Lotus } from "@/pottedPlant/plants/lotus"
import { Monstera } from "@/pottedPlant/plants/monstera"
import { PeaceLily } from "@/pottedPlant/plants/peaceLily"
import { Philodendron } from "@/pottedPlant/plants/philodendron"
import { Pilea } from "@/pottedPlant/plants/pilea"
import { Pothos } from "@/pottedPlant/plants/pothos"
import { Rose } from "@/pottedPlant/plants/rose"
import { SnakePlant } from "@/pottedPlant/plants/snakePlant"
import { KimberlyQueen } from "@/pottedPlant/plants/kimberlyQueen"
import { WiltProvider } from "@/pottedPlant/plants/staged/WiltContext"
import type { PotLook } from "@/pottedPlant/pots"
import { round1 } from "./geometry"
import { plantFrame } from "./placement"
import { SCENE_PLANTS } from "./plants"
import { resolvePot } from "./scenePots"
import type { ScenePlant } from "./types"

/** Draw one species, in a pot, at a growth stage. Every species takes the same props. */
function Species({ type, seed, stage, pot }: Pick<ScenePlant, "type" | "seed" | "stage"> & { pot: PotLook }) {
  switch (type) {
    case "pothos":
      return <Pothos seed={seed} stage={stage} stages={4} pot={pot} />
    case "peace_lily":
      return <PeaceLily seed={seed} stage={stage} stages={4} pot={pot} />
    case "pilea":
      return <Pilea seed={seed} stage={stage} pot={pot} />
    case "snake_plant":
      return <SnakePlant seed={seed} stage={stage} stages={4} pot={pot} />
    case "kimberly_queen":
      return <KimberlyQueen seed={seed} stage={stage} stages={4} pot={pot} />
    case "lily":
      return <Lily seed={seed} stage={stage} stages={4} pot={pot} />
    case "rose":
      return <Rose seed={seed} stage={stage} stages={4} pot={pot} />
    case "monstera":
      return <Monstera seed={seed} stage={stage} stages={4} pot={pot} />
    case "philodendron":
      return <Philodendron seed={seed} stage={stage} stages={4} pot={pot} />
    case "lotus":
      return <Lotus seed={seed} stage={stage} pot={pot} />
  }
}

/**
 * One plant of the scene, placed by its frame. A mirrored plant is flipped about
 * its own middle. The component is memoized, so the sign-in button changing state
 * never redraws the plants.
 */
export const ScenePlantView = memo(function ScenePlantView({ plant }: { plant: ScenePlant }) {
  const frame = plantFrame(plant)
  return (
    <g transform={plant.mirror ? "translate(" + round1(plant.x * 2) + " 0) scale(-1 1)" : undefined} data-plant={plant.id}>
      <svg x={round1(frame.x)} y={round1(frame.y)} width={round1(frame.width)} height={round1(frame.height)} overflow="visible">
        <WiltProvider wilt={plant.wilt}>
          <Species type={plant.type} seed={plant.seed} stage={plant.stage} pot={resolvePot(plant)} />
        </WiltProvider>
      </svg>
    </g>
  )
})

/** The plants of the scene, from the back of the room to the front, so near plants cover far ones. */
export function ScenePlants({ plants = SCENE_PLANTS }: { plants?: readonly ScenePlant[] }) {
  const ordered = [...plants].sort((a, b) => a.y - b.y)
  return (
    <g>
      {ordered.map((plant) => (
        <ScenePlantView key={plant.id} plant={plant} />
      ))}
    </g>
  )
}
