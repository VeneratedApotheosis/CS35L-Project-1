"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { Lily } from "@/pottedPlant/plants/lily"
import { Monstera } from "@/pottedPlant/plants/monstera"
import { PeaceLily } from "@/pottedPlant/plants/peaceLily"
import { Philodendron } from "@/pottedPlant/plants/philodendron"
import { Pilea } from "@/pottedPlant/plants/pilea"
import { Pothos } from "@/pottedPlant/plants/pothos"
import { Rose } from "@/pottedPlant/plants/rose"
import { SnakePlant } from "@/pottedPlant/plants/snakePlant"
import { EmergeProvider } from "@/pottedPlant/plants/staged/EmergeContext"
import { ShrinkProvider } from "@/pottedPlant/plants/staged/ShrinkContext"
import { PottedPlant } from "@/pottedPlant/PottedPlant"
import { POT_SHAPE, potLookFromSeed, type PotLook } from "@/pottedPlant/pots"
import { BOARD, TALL_LAYOUT, WALL_PLANTS, WIDE_LAYOUT, type Shelf, type Slot, type WallLayout, type WallPlant } from "./layouts"

/** The plant canvas every species draws in (see pottedPlant/genome.ts VIEWBOX): "0 30 200 205". */
const PLANT_VIEW = { y: 30, width: 200, height: 205 } as const

/** The canvas height of the pot's lowest point: the plant picture is placed so this lands on the shelf. */
const POT_BASE = POT_SHAPE.body.bounds.y + POT_SHAPE.body.bounds.height

/** The stage the plants start at, and the one they grow into. */
const FIRST_STAGE = 3
const LAST_STAGE = 4
/** The grow-in: how long before the first plant moves, and the gap between plants, in milliseconds. */
const GROW_START = 350
const GROW_GAP = 160

/**
 * How far, in layout units, each pot sits lower than the board point its shadow is
 * drawn at. It brings the pot's base to the middle of the board's height (the top
 * face and the front face together).
 */
const POT_SINK = BOARD.rest + (BOARD.front - BOARD.top) / 2

/**
 * Every pot on the wall is terracotta (palette 0); the seed still varies its band.
 * The pot sits POT_SINK lower than the board point, and its shadow is lifted by the
 * same distance (in the plant's own units, which scale with its size), so the
 * shadow stays where it was.
 */
function wallPot(seed: number, size: number): PotLook {
  return { ...potLookFromSeed(seed), palette: 0, shadowLift: (POT_SINK * PLANT_VIEW.width) / size }
}

/** Draw one species in a pot. Every species takes the same props. */
function Species({ type, seed, stage, pot }: { type: WallPlant["type"]; seed: number; stage: number; pot: PotLook }) {
  switch (type) {
    case "pothos":
      return <Pothos seed={seed} stage={stage} stages={4} pot={pot} />
    case "peace_lily":
      return <PeaceLily seed={seed} stage={stage} stages={4} pot={pot} />
    case "pilea":
      return <Pilea seed={seed} stage={stage} pot={pot} />
    case "snake_plant":
      return <SnakePlant seed={seed} stage={stage} stages={4} pot={pot} />
    case "lily":
      return <Lily seed={seed} stage={stage} stages={4} pot={pot} />
    case "rose":
      return <Rose seed={seed} stage={stage} stages={4} pot={pot} />
    case "monstera":
      return <Monstera seed={seed} stage={stage} stages={4} pot={pot} />
    case "philodendron":
      return <Philodendron seed={seed} stage={stage} stages={4} pot={pot} />
    default:
      return null
  }
}

/** Where a plant's picture goes so that the bottom of its pot lands on (x, y). */
export function plantFrame(x: number, y: number, size: number) {
  const unit = size / PLANT_VIEW.width
  return {
    x: x - size / 2,
    y: y - (POT_BASE - PLANT_VIEW.y) * unit,
    width: size,
    height: PLANT_VIEW.height * unit,
  }
}

/** How long a full-grown plant takes to un-grow back to a sprout when the pointer touches it, in milliseconds. */
export const SHRINK_MS = 100
/** How long after that the plant is swapped, so the un-grow has surely finished, in milliseconds. */
const SWAP_MARGIN_MS = 40
/** How long the pot is left bare, with just soil in it, between the old plant and the new one, in milliseconds. */
const BARE_MS = 250
/** How long the grow animation (the stage-up leaf movement and its bursts) takes before the plant can be replanted again. */
const REGROW_MS = 1700

/**
 * The hit area of a plant, in the plant's own canvas units (200 wide; see PLANT_VIEW). It
 * covers the leaves and not the pot: the rim starts at HIT_FLOOR, so the area stops there.
 * Before the full-grown plant has been measured it is this estimate.
 */
interface HitBox {
  x: number
  y: number
  width: number
  height: number
}
const HIT_FLOOR = 146
const HIT_DEFAULT: HitBox = { x: 40, y: 50, width: 120, height: HIT_FLOOR - 50 }
/** Canvas units added around the measured leaves, so the edge of a leaf is easy to land on. */
const HIT_PADDING = 3
/** How long after a plant reaches its last stage its hit area is measured: after the stage-up animation and its bursts are done. */
const HIT_MEASURE_MS = 1800
/** How many points along each outline are used to find where the leaves reach. */
const OUTLINE_SAMPLES = 24

/**
 * The box around the drawn leaves (every visible shape of the plant except its pot), in
 * canvas units, stopped at the pot's rim. Only the shapes that show are counted, each
 * with its own turn and scale applied: the clipped-away corners of a leaf's shading
 * would make the box too big. Null where the browser cannot measure (tests).
 */
function measureLeaves(frame: SVGSVGElement | null): HitBox | null {
  const drawing = frame?.querySelector("svg")
  const toCanvas = drawing?.getScreenCTM?.()?.inverse()
  if (!drawing || !toCanvas) return null
  const pot = drawing.firstElementChild
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  try {
    for (const shape of Array.from(drawing.querySelectorAll<SVGGraphicsElement>("path, ellipse, circle, polygon"))) {
      if (shape.closest("clipPath, defs, filter") || pot?.contains(shape)) continue
      // Spots and shine on a leaf are clipped to it, but their boxes are not, so they would stretch the area.
      if (!(shape instanceof SVGPathElement) && shape.closest("[clip-path]")) continue
      const onScreen = shape.getScreenCTM()
      if (!onScreen) continue
      const matrix = toCanvas.multiply(onScreen)
      // A path is sampled along its outline, because the box of a turned leaf is much bigger than the leaf.
      const points: [number, number][] = []
      if (shape instanceof SVGPathElement) {
        const length = shape.getTotalLength()
        for (let i = 0; i <= OUTLINE_SAMPLES; i++) {
          const at = shape.getPointAtLength((length * i) / OUTLINE_SAMPLES)
          points.push([at.x, at.y])
        }
      } else {
        const box = shape.getBBox()
        points.push([box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height])
      }
      for (const [x, y] of points) {
        const point = new DOMPoint(x, y).matrixTransform(matrix)
        left = Math.min(left, point.x)
        right = Math.max(right, point.x)
        top = Math.min(top, point.y)
        bottom = Math.max(bottom, point.y)
      }
    }
  } catch {
    return null
  }
  if (!Number.isFinite(left)) return null
  const floor = Math.min(bottom + HIT_PADDING, HIT_FLOOR)
  if (right - left < 10 || floor - top < 10) return null
  return { x: left - HIT_PADDING, y: top - HIT_PADDING, width: right - left + 2 * HIT_PADDING, height: floor - (top - HIT_PADDING) }
}

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true

/** The species a replanted plant can be: the ones on the wall. */
const SPECIES = WALL_PLANTS.map((plant) => plant.type)

/**
 * One plant on its shelf.
 *
 * On load it is drawn one stage short of full, then grows into its last stage,
 * each plant a little after the one before.
 *
 * Touch it with the pointer and it un-grows: the stage-up animation plays
 * backwards, very fast (SHRINK_MS), down to a sprout, which then goes away and
 * leaves the pot bare (BARE_MS). The plant is swapped for a new random plant (a
 * random species and seed, in the same pot) while the pot is bare, so there is
 * never a visible jump from one plant to another. Then the new plant grows out of
 * the soil, with no leaves at first, to the last stage in one stage-up animation.
 *
 * The pointer always works, even in the middle of an animation: a plant that is
 * growing un-grows from the way it looks at that moment, and one that is a sprout
 * or a bare pot gets its new plant at once. Only a plant already un-growing is left to finish.
 * On a touch screen, a touch does the same. People who prefer reduced motion get
 * the new plant fully grown, with no animation.
 */
const WallPlantView = memo(function WallPlantView({ plant, slot, y, order }: { plant: WallPlant; slot: Slot; y: number; order: number }) {
  const [stage, setStage] = useState(FIRST_STAGE)
  const [type, setType] = useState(plant.type)
  const [seed, setSeed] = useState(plant.seed)
  const [changing, setChanging] = useState(false)
  // The pot has no plant in it for a moment, between the old plant and the new one.
  const [bare, setBare] = useState(false)
  // Set when a plant is brought into a bare pot, so it grows out of the soil instead of appearing.
  const [emerge, setEmerge] = useState(false)
  const [hit, setHit] = useState<HitBox>(HIT_DEFAULT)
  const frameRef = useRef<SVGSVGElement>(null)
  // What the plant is doing, and the stage it was last told to be, for the pointer handler to read.
  const phase = useRef<"idle" | "shrinking" | "growing">("idle")
  const shown = useRef(FIRST_STAGE)
  const timers = useRef<number[]>([])
  const later = useCallback((run: () => void, ms: number) => {
    timers.current.push(window.setTimeout(run, ms))
  }, [])
  const clear = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])
  const show = useCallback((next: number) => {
    shown.current = next
    setStage(next)
  }, [])

  useEffect(() => {
    // Only a plant still at the first stage grows in: one that was replanted in the meantime is left alone.
    const timer = window.setTimeout(() => {
      if (shown.current === FIRST_STAGE) show(LAST_STAGE)
    }, prefersReducedMotion() ? 0 : GROW_START + order * GROW_GAP)
    return () => window.clearTimeout(timer)
  }, [order, show])

  useEffect(() => clear, [clear])

  // Once the plant is full grown and the animation has settled, fit the hit area to its leaves.
  useEffect(() => {
    if (stage !== LAST_STAGE) return
    const timer = window.setTimeout(() => {
      const measured = measureLeaves(frameRef.current)
      if (measured) setHit(measured)
    }, HIT_MEASURE_MS)
    return () => window.clearTimeout(timer)
  }, [stage, type, seed])

  const newPlant = () => {
    setType(SPECIES[Math.floor(Math.random() * SPECIES.length)])
    setSeed(Math.floor(Math.random() * 1_000_000))
  }

  const replant = () => {
    // Un-growing already: it is on its way to being swapped.
    if (phase.current === "shrinking") return
    clear()
    if (prefersReducedMotion()) {
      newPlant()
      setBare(false)
      setEmerge(false)
      show(LAST_STAGE)
      phase.current = "idle"
      setChanging(false)
      return
    }
    setChanging(true)
    const done = () => {
      phase.current = "idle"
      setChanging(false)
    }
    // The new plant grows out of the soil of the bare pot, straight to the last stage, in one stage-up animation.
    const plantIn = () => {
      setBare(false)
      setEmerge(true)
      show(LAST_STAGE)
    }
    if (shown.current === 1) {
      // Already as small as it gets (a bare pot): the new plant goes in at once.
      phase.current = "growing"
      newPlant()
      plantIn()
      later(done, REGROW_MS)
      return
    }
    // Un-grow, take the plant away, swap it while the pot is bare, then let the new plant grow out of the soil.
    phase.current = "shrinking"
    show(1)
    const swapAt = SHRINK_MS + SWAP_MARGIN_MS
    later(() => {
      phase.current = "growing"
      setBare(true)
      newPlant()
    }, swapAt)
    later(plantIn, swapAt + BARE_MS)
    later(done, swapAt + BARE_MS + REGROW_MS)
  }

  const base = y + POT_SINK
  const frame = plantFrame(slot.x, base, slot.size)
  // Layout units per canvas unit.
  const unit = slot.size / PLANT_VIEW.width
  return (
    <g data-plant={plant.id} data-changing={changing} data-seed={seed} onPointerEnter={replant}>
      <g transform={plant.mirror ? "translate(" + slot.x * 2 + " 0) scale(-1 1)" : undefined}>
        {/* An invisible target over the leaves, not the pot, so the gaps between leaves count as the plant. */}
        <rect
          data-hit=""
          x={frame.x + hit.x * unit}
          y={frame.y + (hit.y - PLANT_VIEW.y) * unit}
          width={hit.width * unit}
          height={hit.height * unit}
          fill="transparent"
        />
        <svg ref={frameRef} x={frame.x} y={frame.y} width={frame.width} height={frame.height} overflow="visible" pointerEvents="none">
          {bare ? (
            <PottedPlant look={wallPot(plant.seed, slot.size)} title="Empty pot">
              {null}
            </PottedPlant>
          ) : (
            <EmergeProvider emerge={emerge}>
              <ShrinkProvider seconds={SHRINK_MS / 1000}>
                <Species type={type} seed={seed} stage={stage} pot={wallPot(plant.seed, slot.size)} />
              </ShrinkProvider>
            </EmergeProvider>
          )}
        </svg>
      </g>
    </g>
  )
})

/** One board: a shadow on the wall, two brackets, the front face with a little grain, and the lighter top face. */
function ShelfBoard({ shelf }: { shelf: Shelf }) {
  const { y, from, to } = shelf
  const length = to - from
  const bracket = (x: number) => (
    <path
      key={x}
      className="wall__bracket"
      d={"M" + (x - 8) + " " + (y + BOARD.front) + "h16v46a8 8 0 0 1-8 8a8 8 0 0 1-8-8Z"}
    />
  )
  return (
    <g data-shelf="">
      <rect className="wall__shadow" x={from + 8} y={y + BOARD.front - 2} width={length} height={26} rx={13} />
      {bracket(from + length * 0.14)}
      {bracket(to - length * 0.14)}
      <rect className="wall__board-top" x={from + 6} y={y - BOARD.top} width={length - 12} height={BOARD.top + 4} rx={4} />
      <rect className="wall__board" x={from} y={y} width={length} height={BOARD.front} rx={6} />
      <path
        className="wall__grain"
        d={
          "M" + (from + length * 0.08) + " " + (y + 7) + "h" + length * 0.3 +
          "M" + (from + length * 0.52) + " " + (y + 7) + "h" + length * 0.22 +
          "M" + (from + length * 0.22) + " " + (y + 14) + "h" + length * 0.4 +
          "M" + (from + length * 0.7) + " " + (y + 14) + "h" + length * 0.18
        }
      />
    </g>
  )
}

function WallSvg({ layout, variant }: { layout: WallLayout; variant: "wide" | "tall" }) {
  return (
    <svg
      className={"wall__svg wall__svg--" + variant}
      viewBox={"0 0 " + layout.width + " " + layout.height}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {layout.shelves.map((shelf) => (
        <ShelfBoard key={shelf.y} shelf={shelf} />
      ))}
      {WALL_PLANTS.map((plant, index) => {
        const slot = layout.slots[index]
        return <WallPlantView key={plant.id} plant={plant} slot={slot} y={layout.shelves[slot.shelf].y - BOARD.rest} order={index} />
      })}
    </svg>
  )
}

/**
 * The picture beside the login words: eight terracotta pots on light wood
 * shelves, on a sage wall. Two layouts of the same plants are drawn and the
 * screen's width decides which one shows (see login.css). The picture is
 * decorative; the words on the page say everything it does.
 */
export function ShelfWall() {
  return (
    <div className="wall" aria-hidden="true">
      <WallSvg layout={WIDE_LAYOUT} variant="wide" />
      <WallSvg layout={TALL_LAYOUT} variant="tall" />
    </div>
  )
}
