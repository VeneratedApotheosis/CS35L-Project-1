import {
  SIZE_MAX,
  SIZE_MIN,
  SOIL,
  subSeed,
} from "./genome"
import { clamp, easeOutCubic, int, lerp, mulberry32, range } from "./rng"

/* ------------------------------------------------------------------ */
/* Leaf outline                                                        */
/* ------------------------------------------------------------------ */

const EDGE_POINTS = 16
const f = (n: number) => Math.round(n * 100) / 100

/** Closed smooth curve through points (Catmull-Rom converted to cubic Beziers). */
function smoothClosedPath(pts: [number, number][]): string {
  const n = pts.length
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + "Z"
}

/**
 * Coin-shaped leaf centered on (0,0). `squash` flattens it along the stalk
 * direction; `wob` nudges each edge point a few percent so no two are alike.
 */
export function pileaLeafPath(r: number, squash: number, wob: number[]): string {
  const pts: [number, number][] = wob.map((w, k) => {
    const a = (k / wob.length) * Math.PI * 2
    return [Math.cos(a) * r * (1 + w), Math.sin(a) * r * squash * (1 + w)]
  })
  return smoothClosedPath(pts)
}

export function pileaColors(shade: number, back: boolean) {
  const hue = 98 + (shade - 0.5) * 14
  const l = 44 + shade * 10 - (back ? 6 : 0)
  return {
    base: `hsl(${f(hue)} 50% ${f(l)}%)`,
    light: `hsl(${f(hue + 6)} 58% ${f(l + 11)}%)`,
    vein: `hsl(${f(hue + 8)} 58% ${f(l + 20)}%)`,
    dimple: `hsl(${f(hue - 4)} 46% ${f(l - 10)}%)`,
  }
}

/* ------------------------------------------------------------------ */
/* Genome                                                              */
/* ------------------------------------------------------------------ */

export interface PileaLeaf {
  /** Where the stalk leaves the plant: x in px and height above the soil. */
  baseX: number
  baseH: number
  /** Angle around the stem. 0 faces the viewer; its sine places it left or right. */
  phi: number
  /** Stalk elevation in degrees: negative hangs down, positive rises. */
  elev: number
  /** Full-grown stalk length in px. */
  len: number
  /** Full-grown leaf radius in px. */
  r: number
  squash: number
  wob: number[]
  shade: number
  veins: number
  birth: number
  /** True when the leaf is on the far side of the stem. */
  back: boolean
  pup: boolean
}

export interface PileaGenome {
  seed: number
  size: number
  /** Slight sideways lean of the central stem, in px at full height. */
  lean: number
  hMax: number
  /** Sorted back to front. */
  leaves: PileaLeaf[]
}

const GOLDEN_ANGLE = 2.399963 // radians, about 137.5 degrees
const MAX_LEAVES = 34

export function createPilea(seed: number, size = 1): PileaGenome {
  size = clamp(size, SIZE_MIN, SIZE_MAX)
  const rng = mulberry32(seed)
  const baseCount = int(rng, 12, 15)
  const phase = rng() * Math.PI * 2
  const lean = range(rng, -5, 5)
  const hMax = range(rng, 28, 36)
  const pupBase = int(rng, 1, 2)

  // Fewer leaves as size grows. Count falls roughly as 1 / size^1.5.
  const count = Math.round(clamp(baseCount / Math.pow(size, 1.5), 6, MAX_LEAVES))
  const leaves: PileaLeaf[] = []

  const make = (lr: () => number, o: Partial<PileaLeaf> & Pick<PileaLeaf, "baseX" | "baseH" | "phi" | "elev" | "len" | "r" | "birth" | "pup">): PileaLeaf => ({
    squash: range(lr, 0.78, 0.95),
    wob: Array.from({ length: EDGE_POINTS }, () => range(lr, -0.05, 0.05)),
    shade: lr(),
    veins: int(lr, 4, 6),
    back: Math.cos(o.phi) < 0,
    ...o,
  })

  // Main plant: leaves spiral up the stem. Low, old leaves are big and hang
  // over the pot; the newest sit upright on top.
  for (let n = 0; n < count; n++) {
    const lr = mulberry32(subSeed(seed, n, 31))
    const u = count > 1 ? n / (count - 1) : 0
    const phi = phase + n * GOLDEN_ANGLE
    leaves.push(
      make(lr, {
        baseX: SOIL.x + lean * u,
        baseH: hMax * u,
        phi,
        elev: lerp(-12, 64, u) + range(lr, -8, 8),
        len: lerp(68, 34, u) * Math.pow(size, 0.4) * range(lr, 0.9, 1.1),
        r: lerp(15, 10.5, u) * size * range(lr, 0.9, 1.1),
        birth: 0.02 + 0.78 * Math.pow(u, 0.8),
        pup: false,
      }),
    )
  }

  // Pups: baby plants beside the main one, which is a pilea signature.
  const pups = Math.round(clamp(pupBase / size, 1, 2))
  for (let p = 0; p < pups; p++) {
    const side = p % 2 === 0 ? 1 : -1
    const x = SOIL.x + side * range(mulberry32(subSeed(seed, p, 41)), 26, 33)
    const pupBirth = 0.55 + p * 0.17
    for (let k = 0; k < 3; k++) {
      const lr = mulberry32(subSeed(seed, p * 10 + k, 42))
      leaves.push(
        make(lr, {
          baseX: x,
          baseH: 0,
          phi: range(lr, -1.2, 1.2) + (side > 0 ? 0.6 : -0.6),
          elev: 55 + range(lr, -12, 20) + (k === 0 ? 10 : 0),
          len: range(lr, 11, 17) * Math.pow(size, 0.4),
          r: range(lr, 6, 9) * Math.pow(size, 0.85),
          birth: pupBirth + k * 0.05,
          pup: true,
        }),
      )
    }
  }

  leaves.sort((a, b) => Math.cos(a.phi) - Math.cos(b.phi))
  return { seed, size, lean, hMax, leaves }
}

/* ------------------------------------------------------------------ */
/* Growth                                                              */
/* ------------------------------------------------------------------ */

/** 0..1, eased. 0 means not yet visible. */
export const pileaProgress = (l: PileaLeaf, g: number) =>
  easeOutCubic(clamp((g - l.birth) / 0.3))

export interface PileaPlacement {
  /** Stalk start. */
  x0: number
  y0: number
  /** Leaf center. */
  x1: number
  y1: number
  /** Degrees from straight up along the stalk. */
  angle: number
  radius: number
}

export function pileaPlacement(l: PileaLeaf, g: number): PileaPlacement {
  const p = pileaProgress(l, g)
  const len = l.len * p
  const elev = (l.elev * Math.PI) / 180
  const x0 = l.baseX
  const y0 = SOIL.y - l.baseH
  const dx = Math.sin(l.phi) * len * Math.cos(elev)
  const dy = -Math.sin(elev) * len
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI
  return {
    x0,
    y0,
    x1: x0 + dx,
    y1: y0 + dy,
    angle,
    radius: l.r * p * (0.8 + 0.2 * g),
  }
}
