import { placeOutline } from "../geometry"
import { subSeed } from "../genome"
import { clamp, int, mulberry32, range, type Range } from "../rng"
import { domeValue, type Dome } from "../staged/dome"
import type { StagedPlantConfig } from "../staged/types"
import { bladeOutline, type BladeShape } from "./shape"

/*
 * The peace lily's flowers: each is a stalk with a white hood (spathe) and a
 * small spike (spadix). They are placed once per seed at full size, inside a
 * dome taller than the leaf dome, then every stage scales them about the soil
 * point with the rest of the plant. A flower is a bud at `budStage` and open
 * from `bloomStage`.
 */

export interface FlowerConfig {
  /** First stage (counted from 1) in which flowers show as closed buds. */
  budStage: number
  /** First stage in which flowers are open. */
  bloomStage: number
  /** Fewest and most flowers on a plant. */
  count: Range
  /** The flower dome as a multiple of the leaf dome. */
  reach: { width: number; height: number }
  /** Flower head length as a share of the leaf dome height. */
  headLength: number
  lengthFactor: Range
  widthFactor: Range
  /** Height of the head's base as a share of the flower dome height. */
  baseHeight: Range
  /** How far from the middle the outermost heads sit, as a share of the dome half width. */
  slotSpread: number
  /** Random sideways nudge of a head, as a share of the dome half width. */
  slotJitter: number
  /** Share of the way to its head that a stalk's root sits from the middle of the pot. */
  rootFollow: number
  /** Where a stalk bends, as a share of its rise. */
  stalkBend: number
  /** Random tilt added to the stalk's direction at the head, in degrees. */
  headTilt: Range
  /** Tilt of the spadix inside an open hood, in degrees. */
  spadixTilt: Range
  /** Tries to fit a head inside the dome. */
  fitAttempts: number
  /** Each failed try pulls the head toward the middle by this factor. */
  pullIn: number
  /** Each failed try also lowers the head by this share of the flower dome height. */
  lowerStep: number
  /** Each failed try finally multiplies the head length by this. */
  shrinkStep: number
  /** Names this plant's flower random stream, so it never shares draws with the leaves. */
  rngStream: number
}

export type FlowerState = "none" | "bud" | "bloom"

export interface PlacedFlower {
  index: number
  /** Head length at full size. */
  length: number
  /** Hood width factor against the base shape. */
  widthFactor: number
  /** Spadix tilt in degrees. */
  spadixTilt: number
  /** Head direction in degrees from straight up, positive leans right. */
  angle: number
  /** Where the head attaches, at full size. */
  baseX: number
  baseY: number
  stalk: { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number }
}

/** What a flower looks like at a stage (counted from 1). */
export function flowerState(stage: number, config: FlowerConfig): FlowerState {
  if (stage >= config.bloomStage) return "bloom"
  if (stage >= config.budStage) return "bud"
  return "none"
}

/** The flower dome: the leaf dome stretched by `reach`, standing on the same soil point. */
export function flowerDome(leaf: StagedPlantConfig, config: FlowerConfig): Dome {
  return {
    anchor: leaf.dome.anchor,
    halfWidth: leaf.dome.halfWidth * config.reach.width,
    height: leaf.dome.height * config.reach.height,
  }
}

/** Points per side when fitting a head. */
const FIT_STEPS = 12

/**
 * Place a plant's flowers at full size. Heads are spread evenly across the
 * dome, each on a stalk that rises from the pot and bends toward its head. A
 * head that would leave the dome or pass the side limits is pulled in and
 * shortened until it fits. `bloom` is the widest shape a head takes, so
 * fitting it covers the bud too.
 */
export function placeFlowers(
  seed: number,
  leaf: StagedPlantConfig,
  config: FlowerConfig,
  bloom: BladeShape,
): PlacedFlower[] {
  const dome = flowerDome(leaf, config)
  const { anchor } = dome
  const countRng = mulberry32(subSeed(seed, config.rngStream))
  const count = int(countRng, config.count[0], config.count[1])

  const rimWidth = leaf.pot.rimRight - leaf.pot.rimLeft
  const rootReach = (rimWidth * (leaf.roots.range[1] - leaf.roots.range[0])) / 2
  const baseLength = leaf.dome.height * config.headLength

  return Array.from({ length: count }, (_, index) => {
    const rng = mulberry32(subSeed(seed, config.rngStream, index + 1))

    // Heads are spread evenly across the dome; a lone head sits near the middle.
    const slot = count === 1 ? range(rng, -0.35, 0.35) : -1 + (2 * index) / (count - 1)
    const middleness = 1 - Math.abs(slot) * 0.7
    const heightShare = clamp(middleness + range(rng, -0.15, 0.15))
    const lowestBase = config.baseHeight[0]
    let baseHeight = lowestBase + (config.baseHeight[1] - lowestBase) * heightShare

    let targetX =
      anchor.x + (slot * config.slotSpread + range(rng, -config.slotJitter, config.slotJitter)) * dome.halfWidth
    let length = baseLength * range(rng, ...config.lengthFactor)
    const widthFactor = range(rng, ...config.widthFactor)
    const spadixTilt = range(rng, ...config.spadixTilt)
    const tilt = range(rng, ...config.headTilt)

    const shape: BladeShape = { ...bloom, aspect: bloom.aspect * widthFactor }
    const rootX = (x: number) => anchor.x + clamp((x - anchor.x) * config.rootFollow, -rootReach, rootReach)

    let placed: PlacedFlower | null = null
    for (let attempt = 0; attempt < config.fitAttempts; attempt++) {
      const baseY = anchor.y - baseHeight * dome.height
      const x0 = rootX(targetX)
      const y0 = anchor.y
      const cx = x0
      const cy = y0 - (y0 - baseY) * config.stalkBend
      const angle = (Math.atan2(targetX - cx, cy - baseY) * 180) / Math.PI + tilt

      placed = {
        index,
        length,
        widthFactor,
        spadixTilt,
        angle,
        baseX: targetX,
        baseY,
        stalk: { x0, y0, cx, cy, x1: targetX, y1: baseY },
      }

      const outline = placeOutline(bladeOutline(shape, length, FIT_STEPS), { x: targetX, y: baseY }, angle)
      const fits = outline.every(
        ([x, y]) =>
          domeValue(dome, x, y) <= 1 && x >= leaf.limits.left && x <= leaf.limits.right && y <= leaf.limits.floor,
      )
      if (fits) break

      targetX = anchor.x + (targetX - anchor.x) * config.pullIn
      baseHeight -= config.lowerStep
      length *= config.shrinkStep
    }
    return placed as PlacedFlower
  })
}
