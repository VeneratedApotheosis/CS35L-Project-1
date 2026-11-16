import { mulberry32 } from "../../rng"

/**
 * The accents of the stage-up animation: lines that burst out of the plant,
 * pops that swell and fade around it, and, only when the plant reaches its last
 * stage, stars. Every accent is a small, short-lived shape in the plant's own
 * drawing, placed around the leaves. They are made from the seed and the stage,
 * so the same plant always celebrates the same way.
 *
 * How many there are and how big they are follow the plant's size: a sprout
 * gets a few small accents close around it, and a full plant gets more, larger
 * ones. How far a line travels grows more slowly than the plant does.
 */
export const ACCENTS = {
  /** The most of each kind there ever is, which a fully grown plant gets. A smaller plant gets proportionally fewer. */
  max: { lines: 5, pops: 3, stars: 2 },
  /** No stage gets fewer than this many of a kind. */
  fewest: { lines: 2, pops: 1, stars: 1 },
  /** Size units, as a share of the plant's dome width. They grow in step with the plant. */
  line: { length: 0.2, width: 0.026 },
  pop: { radius: 0.075 },
  star: { radius: 0.11 },
  /**
   * How far accents sit from the plant, and how far a line travels, for a smaller
   * plant than the full-size one. Each is multiplied by the plant's scale raised
   * to its power: 1 keeps it in step with the plant, so a sprout's accents hug the
   * sprout, and 0 would make it the same at every stage. The distance from the
   * plant is in step. The travel grows more slowly, so a big plant's lines don't fly far.
   */
  distanceGrowth: 1,
  travelGrowth: 0.4,
  /** How far a line travels outward as it bursts, as a share of the full-size dome width. */
  travel: 0.09,
  /**
   * The accents sit on a half-oval around the plant: it stands on the soil
   * (center height 0) and runs from the pot's left side over the top to its
   * right side. Its size is a share of the full-size dome.
   */
  ring: { across: 1.08, up: 1.04, centerHeight: 0 },
  /** The half-oval runs between these angles, in shares of a half turn, so the ends stay off the pot. */
  arc: { from: 0.03, to: 0.97 },
  /** Accents start at different moments, up to this many seconds into the animation. */
  maxDelay: 0.42,
  /** Seconds each kind spends moving into place or swelling. */
  motion: { line: 0.46, pop: 0.55, star: 0.5 },
  /** Seconds an accent stays after it has finished moving, fading away. */
  linger: 0.5,
  colors: {
    line: ["#8ed36d", "#c6e86a"],
    pop: ["#ffe27a", "#bfeaa3", "#9fdcc0"],
    star: ["#ffd23f", "#fff0a8"],
  },
} as const

/** Seconds from the start of the animation until the last accent has gone. */
export const ACCENTS_END = ACCENTS.maxDelay + Math.max(...Object.values(ACCENTS.motion)) + ACCENTS.linger

export type AccentKind = "line" | "pop" | "star"

export interface Accent {
  kind: AccentKind
  /** Where on the oval around the plant, in radians from the right, turning up. */
  angle: number
  /** How far out, as a share of the oval's size. */
  reach: number
  /** Size, in canvas units. */
  size: number
  /** Seconds after the start of the animation when it starts, how long it moves, and how long it lasts in all. */
  delay: number
  motion: number
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
  /** The stage's size: 1 for the last stage, smaller before. */
  scale: number
}

/** Count for a kind: the full-plant count scaled by the plant's size, never below the least. */
export function accentCount(kind: AccentKind, scale: number): number {
  const key = kind === "line" ? "lines" : kind === "pop" ? "pops" : "stars"
  const most = ACCENTS.max[key]
  return Math.min(most, Math.max(ACCENTS.fewest[key], Math.round(most * Math.min(Math.max(scale, 0), 1))))
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
      // Spread evenly over the whole half-oval, with a little jitter so no two bunch up. Each kind is
      // nudged a little to one side or the other of the middle kind so they interleave. The nudges
      // add up to nothing, so neither side of the plant gets more than the other.
      const nudge = ((kindIndex - (kinds.length - 1) / 2) * 0.5) / (kinds.length * count)
      const share = Math.min(Math.max((i + 0.5 + (rng() - 0.5) * 0.6) / count + nudge, 0), 1)
      const angle = Math.PI * (ACCENTS.arc.from + (ACCENTS.arc.to - ACCENTS.arc.from) * share)
      const unit = kind === "line" ? ACCENTS.line.length : kind === "pop" ? ACCENTS.pop.radius : ACCENTS.star.radius
      const palette = ACCENTS.colors[kind]
      const motion = ACCENTS.motion[kind]
      accents.push({
        kind,
        angle,
        reach: kind === "line" ? 1.02 + rng() * 0.1 : 0.78 + rng() * 0.5,
        size: width * unit * (0.75 + rng() * 0.5),
        delay: rng() * ACCENTS.maxDelay,
        motion,
        life: motion + ACCENTS.linger,
        color: palette[Math.floor(rng() * palette.length)],
        turn: (rng() - 0.5) * 50,
      })
    }
  })
  return accents
}

/**
 * The half-oval the accents sit on, for this stage: its middle on the soil, and
 * how far across and up it reaches, and how far a line may travel. The oval
 * is the full-size one scaled down with the plant, so a sprout's accents hug it.
 */
export function accentRing(area: AccentArea): { x: number; y: number; across: number; up: number; travel: number } {
  const scale = Math.max(area.scale, 0.05)
  const distance = scale ** ACCENTS.distanceGrowth
  return {
    x: area.x,
    y: area.y - (area.height / scale) * ACCENTS.ring.centerHeight,
    across: (area.halfWidth / scale) * ACCENTS.ring.across * distance,
    up: (area.height / scale) * ACCENTS.ring.up * distance,
    travel: scale ** ACCENTS.travelGrowth,
  }
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
  /** For a line: how far from its start it has moved outward, in canvas units. */
  travel: number
}

const easeOut = (k: number) => 1 - (1 - k) ** 3
const easeOutBack = (k: number) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2
const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1)

/** Where an accent is, and how it looks, `time` seconds into the animation. Null when it isn't showing. */
export function accentFrame(accent: Accent, area: AccentArea, time: number): AccentFrame | null {
  const elapsed = time - accent.delay
  if (elapsed <= 0 || elapsed >= accent.life) return null
  const moved = clamp01(elapsed / accent.motion)
  const k = elapsed / accent.life

  const ring = accentRing(area)
  const x = ring.x + Math.cos(accent.angle) * ring.across * accent.reach
  const y = ring.y - Math.sin(accent.angle) * ring.up * accent.reach

  if (accent.kind === "line") {
    // A line shoots outward, stretching as it goes. Then it stays where it is and fades away.
    const travel = ACCENTS.travel * (area.halfWidth * 2 / Math.max(area.scale, 0.05)) * ring.travel
    return {
      x,
      y,
      opacity: k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6,
      grown: easeOut(Math.min(1, moved * 1.4)),
      rotation: 0,
      travel: easeOut(moved) * travel,
    }
  }
  if (accent.kind === "pop") {
    // A pop swells fast, then stays and fades.
    return { x, y, opacity: 1 - k * k, grown: easeOut(Math.min(1, moved * 1.6)), rotation: 0, travel: 0 }
  }
  // A star pops in with a bounce, turns a little, stays, and shrinks away at the end.
  const popIn = easeOutBack(clamp01(elapsed / (accent.motion * 0.9)))
  const shrink = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
  return {
    x,
    y,
    opacity: k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3,
    grown: Math.max(0, popIn * shrink),
    rotation: accent.turn + k * 70,
    travel: 0,
  }
}
