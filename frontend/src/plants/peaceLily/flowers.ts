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
  /**
   * How high the top of a flower head stands above the soil, as a share of the
   * plant's maximum height (the leaf dome height). Above 1 is taller than the
   * tallest leaf can be.
   */
  height: Range
  /**
   * The widest a flower head may sit from the middle, in degrees. The angle is
   * measured at the soil point, between straight up and the middle of the head,
   * so it holds at any height. The outermost heads sit at this angle.
   */
  maxSpread: number
  /** Random nudge of a head's angle from the middle, in degrees. It never takes a head past `maxSpread`. */
  slotJitter: number
  /** Share of the way to its head that a stalk's root sits from the middle of the pot. */
  rootFollow: number
  /** Where a stalk bends, as a share of its rise. */
  stalkBend: number
  /** The most a head leans from straight up because of its stalk, in degrees. */
  maxLean: number
  /** Random tilt added to the stalk's direction at the head, in degrees. */
  headTilt: Range
  /** Tilt of the spadix inside an open hood, in degrees. */
  spadixTilt: Range
  /** Tries to fit a head inside the dome. */
  fitAttempts: number
  /** Each failed try pulls the head toward the middle by this factor. */
  pullIn: number
  /** Each failed try also lowers the head by this share of the leaf dome height. */
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

/** How far past `maxSpread`, in degrees, a head may land because its lean moves its middle. Rounding only. */
const SPREAD_TOLERANCE = 0.001

/** Where the middle of a flower head is, at full size. */
export function flowerCenter(flower: PlacedFlower): { x: number; y: number } {
  const a = (flower.angle * Math.PI) / 180
  return {
    x: flower.baseX + Math.sin(a) * flower.length * 0.5,
    y: flower.baseY - Math.cos(a) * flower.length * 0.5,
  }
}

/** The angle, in degrees, between straight up from the soil point and the middle of the flower head. Always 0 or more. */
export function flowerSpread(flower: PlacedFlower, anchor: { x: number; y: number }): number {
  const c = flowerCenter(flower)
  return (Math.atan2(Math.abs(c.x - anchor.x), anchor.y - c.y) * 180) / Math.PI
}

/** Times the base is shifted to bring a leaning head's top to the height wanted. */
const TIP_REFINEMENTS = 3

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
    let tipHeight = (config.height[0] + (config.height[1] - config.height[0]) * heightShare) * leaf.dome.height

    let slotAngle = clamp(
      slot * config.maxSpread + range(rng, -config.slotJitter, config.slotJitter),
      -config.maxSpread,
      config.maxSpread,
    )
    let length = baseLength * range(rng, ...config.lengthFactor)
    const widthFactor = range(rng, ...config.widthFactor)
    const spadixTilt = range(rng, ...config.spadixTilt)
    const tilt = range(rng, ...config.headTilt)

    const shape: BladeShape = { ...bloom, aspect: bloom.aspect * widthFactor }
    const rootX = (x: number) => anchor.x + clamp((x - anchor.x) * config.rootFollow, -rootReach, rootReach)

    /** The flower with its head attached at `baseY`, and its open hood's outline. */
    // Where the head sits across the pot: out from the middle at the head's angle, at the height of the head's middle.
    let targetX = anchor.x
    const build = (baseY: number) => {
      const x0 = rootX(targetX)
      const y0 = anchor.y
      let cx = x0
      let cy = y0 - (y0 - baseY) * config.stalkBend
      // The head continues the stalk's direction, but never leans past `maxLean`. A low
      // head has a short stalk, which would otherwise tip it sideways. When it is capped,
      // the stalk is bent to arrive along the head's own direction instead.
      const natural = (Math.atan2(targetX - cx, cy - baseY) * 180) / Math.PI
      const lean = clamp(natural, -config.maxLean, config.maxLean)
      const angle = lean + tilt
      if (lean !== natural) {
        const reach = Math.max(y0 - baseY, 1) * config.stalkBend
        cx = targetX - Math.sin((lean * Math.PI) / 180) * reach
        cy = baseY + Math.cos((lean * Math.PI) / 180) * reach
      }
      const flower: PlacedFlower = {
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
      return { flower, outline }
    }

    let placed: PlacedFlower | null = null
    for (let attempt = 0; attempt < config.fitAttempts; attempt++) {
      // Put the top of the head at the height we want. The head leans, so its top is
      // not exactly one length above its base; measure where it lands and shift the
      // base by the difference, a few times.
      const wantedTopY = anchor.y - tipHeight
      targetX = anchor.x + Math.tan((slotAngle * Math.PI) / 180) * Math.max(tipHeight - length / 2, 0)
      let built = build(wantedTopY + length)
      for (let step = 0; step < TIP_REFINEMENTS; step++) {
        const topY = Math.min(...built.outline.map(([, y]) => y))
        const lift = wantedTopY - topY
        // The head leans, so its middle is not over its base. Slide the head sideways until
        // its middle sits on the wanted angle from the soil point.
        const middle = flowerCenter(built.flower)
        targetX += anchor.x + Math.tan((slotAngle * Math.PI) / 180) * (anchor.y - (middle.y + lift)) - middle.x
        built = build(built.flower.baseY + lift)
      }
      placed = built.flower
      const outline = built.outline
      const inside = outline.every(
        ([x, y]) =>
          domeValue(dome, x, y) <= 1 && x >= leaf.limits.left && x <= leaf.limits.right && y <= leaf.limits.floor,
      )
      const withinSpread = flowerSpread(built.flower, anchor) <= config.maxSpread + SPREAD_TOLERANCE
      if (inside && withinSpread) break

      // Too wide: come in toward the middle. Out of bounds: come in, drop lower and shrink.
      slotAngle *= config.pullIn
      if (!inside) {
        tipHeight -= config.lowerStep * leaf.dome.height
        length *= config.shrinkStep
      }
    }
    return placed as PlacedFlower
  })
}
