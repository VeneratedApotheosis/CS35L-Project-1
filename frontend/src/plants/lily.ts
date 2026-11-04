import {
  SIZE_MAX,
  SIZE_MIN,
  SOIL,
  subSeed,
  type VinePoint,
} from "./genome"
import { POT_PALETTES, type PotBand } from "./pot"
import { clamp, easeOutCubic, int, lerp, mulberry32, pick, range } from "./rng"

/* ------------------------------------------------------------------ */
/* Leaf outline                                                        */
/* ------------------------------------------------------------------ */

export interface LilyLeafSpec {
  /** Width divided by length. Peace lily leaves are slim. */
  aspect: number
  /** 0 blunt tip, 1 long drawn-out tip. */
  tip: number
  /** Extra width on the right side. */
  asym: number
  /** 0 dark, 1 bright. */
  shade: number
}

const f = (n: number) => Math.round(n * 100) / 100

/** Glossy lance shape: rounded base at (0,0), pointed tip at (0,-length). */
export function lilyLeafPath(length: number, spec: LilyLeafSpec): string {
  const L = length
  const wl = (L * spec.aspect) / 2
  const wr = wl * (1 + spec.asym)
  const k = lerp(0.45, 0.08, spec.tip)

  return [
    "M0 0",
    `C${f(-0.9 * wl)} ${f(-0.08 * L)} ${f(-1.0 * wl)} ${f(-0.42 * L)} ${f(-0.55 * wl)} ${f(-0.72 * L)}`,
    `C${f(-0.3 * wl)} ${f(-0.88 * L)} ${f(-k * wl)} ${f(-0.96 * L)} 0 ${f(-L)}`,
    `C${f(k * wr)} ${f(-0.96 * L)} ${f(0.3 * wr)} ${f(-0.88 * L)} ${f(0.55 * wr)} ${f(-0.72 * L)}`,
    `C${f(1.0 * wr)} ${f(-0.42 * L)} ${f(0.9 * wr)} ${f(-0.08 * L)} 0 0Z`,
  ].join(" ")
}

export function lilyLeafColors(spec: LilyLeafSpec) {
  const hue = 138 + (spec.shade - 0.5) * 14
  const l = 25 + spec.shade * 8
  return {
    base: `hsl(${f(hue)} 42% ${f(l)}%)`,
    light: `hsl(${f(hue + 8)} 46% ${f(l + 10)}%)`,
    vein: `hsl(${f(hue + 12)} 45% ${f(l + 22)}%)`,
  }
}

/* ------------------------------------------------------------------ */
/* Spathe (the white "flower")                                         */
/* ------------------------------------------------------------------ */

/** Teardrop hood: base at (0,0), tip at (0,-length), widest near the lower third. */
export function spathePath(length: number, halfWidth: number): string {
  const S = length
  const w = halfWidth
  return [
    "M0 0",
    `C${f(-1.0 * w)} ${f(-0.05 * S)} ${f(-1.15 * w)} ${f(-0.62 * S)} 0 ${f(-S)}`,
    `C${f(1.15 * w)} ${f(-0.62 * S)} ${f(1.0 * w)} ${f(-0.05 * S)} 0 0Z`,
  ].join(" ")
}

/* ------------------------------------------------------------------ */
/* Genome                                                              */
/* ------------------------------------------------------------------ */

export interface LilyLeaf extends LilyLeafSpec {
  /** Full-grown length in px. */
  size: number
  /** Direction the leaf points, in degrees from straight up (radial from the soil). */
  radial: number
  jitter: number
  /** 0..1, how far a grown leaf arches toward the ground. */
  droop: number
}

export interface LilyStem {
  start: number
  span: number
  pts: VinePoint[]
  /** Outward direction, -1 left or 1 right. */
  dir: 1 | -1
  leaf: LilyLeaf
  z: number
}

export interface LilyFlower {
  start: number
  span: number
  pts: VinePoint[]
  /** Full-grown spathe length in px. */
  length: number
  /** Half width / length when fully open. */
  aspect: number
  /** Degrees the spathe leans from the stalk. */
  lean: number
}

export interface LilyGenome {
  seed: number
  size: number
  pot: number
  band: PotBand
  stems: LilyStem[]
  flowers: LilyFlower[]
}

const STEPS = 14
/** Dome radius for the back and front rows of leaves, in px. */
const R_BACK = 86
const R_FRONT = 70
const MAX_STEMS = 16
/** Widest leaf direction from vertical. 84 makes a near half-circle. */
const SPREAD = 84
/** Flowers only appear in the later stages: buds around stage 3, open at 4. */
const FLOWER_STARTS = [0.4, 0.5, 0.6]
const FLOWER_SPAN = 0.28
const STEM_SPAN = 0.3

/** Stem i begins growing at this growth value: fast at first, then tapering off. */
const stemStart = (i: number) => (i < 2 ? 0 : 0.6 * (1 - Math.exp(-(i - 1) * 0.3)))

function walk(
  x0: number,
  theta0: number,
  curve: number,
  length: number,
  power: number,
): VinePoint[] {
  const pts: VinePoint[] = []
  let x = x0
  let y = SOIL.y
  const step = length / STEPS
  for (let k = 0; k <= STEPS; k++) {
    const t = k / STEPS
    const theta = theta0 + curve * Math.pow(t, power)
    pts.push({ x, y, theta: (theta * 180) / Math.PI })
    x += Math.sin(theta) * step
    y -= Math.cos(theta) * step
  }
  return pts
}

const rad = (deg: number) => (deg * Math.PI) / 180

export function createPeaceLily(seed: number, size = 1): LilyGenome {
  size = clamp(size, SIZE_MIN, SIZE_MAX)
  const rng = mulberry32(seed)
  const pot = int(rng, 0, POT_PALETTES.length - 1)
  const band = pick(rng, ["none", "stripe", "dots"] as const)
  const baseStems = int(rng, 12, 14)
  const baseFlowers = int(rng, 2, 3)
  const phase = rng()

  // Fewer stems as size grows. Leaf length grows gently, width faster, so the
  // dome stays inside the canvas while leaves look bigger and chunkier.
  const stemCount = Math.round(clamp(baseStems / size, 5, MAX_STEMS))
  const lengthScale = Math.pow(size, 0.3)
  const widthScale = Math.pow(size, 0.7)
  const stems: LilyStem[] = []

  for (let i = 0; i < stemCount; i++) {
    const sr = mulberry32(subSeed(seed, i, 11))
    const front = i % 2 === 1
    const R = front ? R_FRONT : R_BACK

    // Golden-ratio spread fills the half-circle evenly as stems are added.
    // Early stems stay near the middle; later ones reach toward the rim.
    const unit = ((i * 0.618 + phase) % 1) - 0.5
    const reach = clamp(0.3 + i * 0.16, 0, 1)
    const radial = unit * 2 * SPREAD * reach + range(sr, -4, 4)
    const radialRad = rad(radial)
    // Rim leaves are longer and crown leaves shorter, so tips trace a round arc.
    const rimBoost = 0.86 + 0.34 * Math.pow(Math.abs(radial) / SPREAD, 1.3)
    const dir: 1 | -1 = radial >= 0 ? 1 : -1

    const stemLength = range(sr, 20, 30) * (front ? 0.85 : 1)
    const x0 = SOIL.x + Math.sin(radialRad) * 10
    // Stem leans a bit less than the leaf, then curves to meet its direction.
    const pts = walk(x0, radialRad * 0.75, radialRad * 0.25, stemLength, 1.6)

    stems.push({
      start: stemStart(i),
      span: STEM_SPAN,
      pts,
      dir,
      leaf: {
        aspect: range(sr, 0.56, 0.68) * widthScale,
        tip: range(sr, 0.5, 0.95),
        asym: range(sr, -0.08, 0.08),
        shade: sr(),
        size: (R - stemLength) * range(sr, 0.92, 1.06) * lengthScale * rimBoost,
        radial,
        jitter: range(sr, -6, 6),
        // Rim leaves arch down more than leaves at the crown.
        droop: 0.03 + 0.08 * Math.pow(Math.abs(radial) / SPREAD, 2),
      },
      z: (front ? 1 : 0) + sr() * 0.9,
    })
  }
  stems.sort((a, b) => a.z - b.z)

  // Fewer, bigger flowers as size grows, but always at least one.
  const flowerCount = Math.round(clamp(baseFlowers / size, 1, FLOWER_STARTS.length))
  const flowers: LilyFlower[] = []
  for (let j = 0; j < flowerCount; j++) {
    const fr = mulberry32(subSeed(seed, j, 22))
    const dir = fr() < 0.5 ? 1 : -1
    const theta0 = rad(range(fr, 3, 14)) * dir * (j % 2 ? -1 : 1)
    flowers.push({
      start: FLOWER_STARTS[j] + range(fr, -0.02, 0.02),
      span: FLOWER_SPAN,
      pts: walk(
        SOIL.x + range(fr, -12, 12),
        theta0,
        rad(range(fr, 4, 14)) * dir,
        range(fr, 100, 122),
        1.8,
      ),
      length: range(fr, 24, 30) * size,
      aspect: range(fr, 0.3, 0.38),
      lean: range(fr, 8, 22) * dir,
    })
  }

  return { seed, size, pot, band, stems, flowers }
}

/* ------------------------------------------------------------------ */
/* Growth                                                              */
/* ------------------------------------------------------------------ */

export const stemFraction = (s: { start: number; span: number }, g: number) =>
  clamp((g - s.start) / s.span)

/** Leaf opens once its stem is about 60% grown. */
export const lilyLeafProgress = (s: LilyStem, g: number) =>
  easeOutCubic(clamp((g - (s.start + s.span * 0.6)) / 0.3))

export const lilyLeafSize = (s: LilyStem, g: number) =>
  s.leaf.size * lilyLeafProgress(s, g) * (0.75 + 0.25 * g)

/** Spathe growth: hidden until the stalk is nearly done, then swells. */
export const flowerProgress = (fl: LilyFlower, g: number) =>
  clamp((g - (fl.start + fl.span * 0.75)) / 0.35)

/** 0 closed bud, 1 fully open. */
export const flowerOpenness = (fl: LilyFlower, g: number) =>
  easeOutCubic(clamp((flowerProgress(fl, g) - 0.3) / 0.7))

export function lilyLeafAngle(s: LilyStem, g: number) {
  const a = s.leaf.radial + s.leaf.jitter
  const diff = ((((180 - a) % 360) + 540) % 360) - 180
  return a + diff * s.leaf.droop * lilyLeafProgress(s, g)
}
