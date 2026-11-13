import { mulberry32 } from "../../rng"

/**
 * The accents of the stage-up animation: lines that burst out of the plant,
 * pops that swell and fade around it, and, only when the plant reaches its last
 * stage, stars. Every accent is a small, short-lived shape in the plant's own
 * drawing, placed around the leaves. They are made from the seed and the stage,
 * so the same plant always celebrates the same way.
 *
 * How many there are and how big they are follow the plant's size: a sprout
 * gets a few small accents and a full plant gets many large ones.
 */
export const ACCENTS = {
  /** The most of each kind there ever is, which a fully grown plant gets. A smaller plant gets proportionally fewer. */
  max: 10,
  /** No stage gets fewer than this many of a kind. */
  fewest: { lines: 4, pops: 3, stars: 3 },
  /** Size units, as a share of the plant's dome width. */
  line: { length: 0.2, width: 0.026 },
  pop: { radius: 0.075 },
  star: { radius: 0.11 },
  /**
   * The accents sit on a half-oval around the plant: it stands on the soil
   * (center height 0) and runs from the pot's left side over the top to its
   * right side. Its size is a share of the plant's dome.
   */
  ring: { across: 1.15, up: 1.12, centerHeight: 0 },
  /** The half-oval runs between these angles, in shares of a half turn, so the ends stay off the pot. */
  arc: { from: 0.03, to: 0.97 },
  /** Accents start at different moments, up to this share of the animation. */
  maxDelay: 0.38,
  colors: {
    line: ["#8ed36d", "#c6e86a"],
    pop: ["#ffe27a", "#bfeaa3", "#9fdcc0"],
    star: ["#ffd23f", "#fff0a8"],
  },
} as const

export type AccentKind = "line" | "pop" | "star"

export interface Accent {
  kind: AccentKind
  /** Where on the oval around the plant, in radians from the right, turning up. */
  angle: number
  /** How far out, as a share of the oval's size. */
  reach: number
  /** Size, in canvas units. */
  size: number
  /** When it starts and how long it lasts, as shares of the animation. */
  delay: number
  life: number
  color: string
  /** A fixed extra turn, for stars. */
  turn: number
}

export interface AccentArea {
  /** The middle of the dome's foot, on the soil. */
  x: number
  y: number
  halfWidth: number
  height: number
}

/** Count for a kind: the full-plant count scaled by the plant's size, never below the least. */
export function accentCount(kind: AccentKind, scale: number): number {
  const least = ACCENTS.fewest[kind === "line" ? "lines" : kind === "pop" ? "pops" : "stars"]
  return Math.min(ACCENTS.max, Math.max(least, Math.round(ACCENTS.max * Math.min(Math.max(scale, 0), 1))))
}

/**
 * The accents for a plant arriving at a stage. `scale` is the stage's size
 * (the last stage is 1) and `area` its dome. `last` is true for the final stage,
 * which is the only one with stars.
 */
export function makeAccents(seed: number, stage: number, scale: number, area: AccentArea, last: boolean): Accent[] {
  const rng = mulberry32((seed * 2654435761 + stage * 40503) >>> 0)
  const accents: Accent[] = []
  const width = area.halfWidth * 2
  const kinds: AccentKind[] = last ? ["line", "pop", "star"] : ["line", "pop"]

  kinds.forEach((kind, kindIndex) => {
    const count = accentCount(kind, scale)
    for (let i = 0; i < count; i++) {
      // Spread evenly over the whole half-oval, each kind a little offset from the others so they
      // interleave, with a little jitter so no two bunch up.
      const offset = kindIndex / (kinds.length * count)
      const share = Math.min(Math.max((i + 0.5 + (rng() - 0.5) * 0.6) / count + offset - 0.5 / count, 0), 1)
      const angle = Math.PI * (ACCENTS.arc.from + (ACCENTS.arc.to - ACCENTS.arc.from) * share)
      const unit = kind === "line" ? ACCENTS.line.length : kind === "pop" ? ACCENTS.pop.radius : ACCENTS.star.radius
      const palette = ACCENTS.colors[kind]
      accents.push({
        kind,
        angle,
        reach: kind === "line" ? 1.02 + rng() * 0.1 : 0.78 + rng() * 0.5,
        size: width * unit * (0.75 + rng() * 0.5),
        delay: rng() * ACCENTS.maxDelay,
        life: kind === "line" ? 0.42 : 0.5,
        color: palette[Math.floor(rng() * palette.length)],
        turn: (rng() - 0.5) * 50,
      })
    }
  })
  return accents
}

export interface AccentFrame {
  /** Where to draw it. */
  x: number
  y: number
  /** 0 hidden to 1 solid. */
  opacity: number
  /** 0 to 1 and a little over: how grown it is. */
  grown: number
  /** Degrees to turn it. */
  rotation: number
  /** For a line: how far from its start it has travelled, 0 to 1. */
  travel: number
}

const easeOut = (k: number) => 1 - (1 - k) ** 3
const easeOutBack = (k: number) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2

/** Where an accent is, and how it looks, `time` of the way through the animation (0 to 1). */
export function accentFrame(accent: Accent, area: AccentArea, time: number): AccentFrame | null {
  const k = (time - accent.delay) / accent.life
  if (k <= 0 || k >= 1) return null

  const centerY = area.y - area.height * ACCENTS.ring.centerHeight
  const radiusX = area.halfWidth * ACCENTS.ring.across * accent.reach
  const radiusY = area.height * ACCENTS.ring.up * accent.reach
  const x = area.x + Math.cos(accent.angle) * radiusX
  const y = centerY - Math.sin(accent.angle) * radiusY

  if (accent.kind === "line") {
    // A line shoots outward, stretching, then thins away at its far end.
    return { x, y, opacity: k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4, grown: Math.sin(Math.PI * k), rotation: 0, travel: easeOut(k) }
  }
  if (accent.kind === "pop") {
    // A pop swells fast, then fades while it keeps swelling a little.
    return { x, y, opacity: 1 - k * k, grown: easeOut(Math.min(1, k * 1.6)), rotation: 0, travel: 0 }
  }
  // A star pops in with a bounce, turns a little, and shrinks away.
  const pop = k < 0.45 ? easeOutBack(k / 0.45) : 1 - (k - 0.45) / 0.55
  return { x, y, opacity: k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, grown: Math.max(0, pop), rotation: accent.turn + k * 70, travel: 0 }
}
