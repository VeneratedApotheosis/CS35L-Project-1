"use client"

import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { BOARD, PLANT_VIEW, POT_SINK, plantFrame } from "@/components/shelf/geometry"
import { useHoldToLog } from "@/components/useHoldToLog"
import { formatDate } from "@/lib/goal"
import { getHabit, habitKeys, type HabitWithStats } from "@/lib/habits"
import { habitSeed } from "@/pottedPlant/habitSeed"
import { plantTypeById } from "@/pottedPlant/plants/plantTypes"
import { wiltForHealth } from "@/pottedPlant/plants/staged/wilt"
import { potLookFromSeed } from "@/pottedPlant/pots"
import { HOVER_CARD_WIDTH } from "./gardenLayout"
import { HabitCard, daysBetween } from "./HabitCard"

/** How long the pointer is held on a plant to log today, in milliseconds. */
export const HOLD_MS = 1000

/**
 * A press that lasts longer than this, in milliseconds, is a hold and not a click: it never opens the
 * panel, whether or not it was long enough to log (a finished habit cannot be logged, but is still held).
 */
export const CLICK_MAX_MS = 400

/** The share of the plant picture's width the plant's button covers: less than the gap between pots, so neighbours never overlap. */
const HIT_WIDTH = 0.62
/** Where the button starts, as a share of the picture's height, by growth stage: a sprout has no leaves up high. */
const HIT_TOP = { 1: 0.55, 2: 0.4, 3: 0.25, 4: 0.12 } as const

/**
 * The card behind a hovered plant, in pixels: how far it reaches above its board (over the tallest
 * plant and the name) and below the front of the board (for the progress). Its width is
 * HOVER_CARD_WIDTH, and the pots are far enough apart for it.
 */
const CARD_ABOVE_BOARD = 368
const CARD_BELOW_BOARD = 128

const healthWords = { healthy: "healthy", slightly_wilted: "slightly wilted", wilted: "wilted" } as const

/** The short text with the progress: where this period stands, or the state of a habit that is not running. */
export function progressLine(habit: HabitWithStats, today: string): string {
  const { state, current_period: period } = habit.stats
  if (state === "expired") return "Finished"
  if (state === "not_started") return `Starts ${formatDate(habit.start_date)}`
  const left = today ? daysBetween(today, period.end) : null
  const days = left === null ? "" : left <= 0 ? " · ends today" : ` · ${left} ${left === 1 ? "day" : "days"} left`
  return `${period.count} of ${period.target}${days}`
}

export interface GardenPlantProps {
  habit: HabitWithStats
  userId: string
  today: string
  /** The middle of the pot and the board point it stands on, in layout units, and the pot's size in the same units. */
  x: number
  shelfY: number
  size: number
  /** Pixels per layout unit. */
  scale: number
  /** Which side of the plant the peek panel opens on, so it stays on the wall. */
  side: "left" | "right"
  /** Whether holding the plant logs today: not for a habit that has finished, or while another log is being saved. */
  canLog: boolean
  peekOpen: boolean
  /** The peek panel, drawn beside the plant while peekOpen. */
  peek: ReactNode
  /** Click or tap. */
  onPeek: () => void
  /** The pointer was held on the plant long enough. */
  onHold: () => void
}

/**
 * One habit's plant on its shelf. At rest it shows only the plant: the name is in the button's label.
 *
 * Hover or keyboard focus: a soft, see-through card appears behind the plant, with its name, what
 * is left, the streak and this period's progress. It stays while the plant is held and while its
 * panel is open. Click: the peek panel, beside the card. Hold: a ring fills and today is logged.
 * A touch has no hover, so a tap opens the card and the panel.
 */
export function GardenPlant({ habit, userId, today, x, shelfY, size, scale, side, canLog, peekOpen, peek, onPeek, onHold }: GardenPlantProps) {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const hold = useHoldToLog(canLog ? onHold : undefined, HOLD_MS)
  // When the pointer went down, so a click that comes after a long press can be told from a real one.
  const pressedAt = useRef<number | null>(null)
  const plant = plantTypeById(habit.plant_type)
  // The card stays open while the plant is held and while its panel is open, even with the pointer gone.
  const hot = hover || focus || peekOpen || hold.holding

  // The streak is not in the list, so it is fetched the first time it is wanted.
  const detail = useQuery({
    queryKey: habitKeys.detail(userId, habit.id),
    queryFn: () => getHabit(habit.id),
    enabled: hot,
    retry: false,
    staleTime: 30_000,
  })
  if (!plant) return null
  const { Preview } = plant

  const seed = habitSeed(habit.id)
  // The pot stands lower, with its base about the middle of the board's height, and its shadow stays on the board.
  const pot = { ...potLookFromSeed(seed), shadowLift: (POT_SINK * PLANT_VIEW.width) / size }
  const frame = plantFrame(x * scale, (shelfY + POT_SINK) * scale, size * scale)
  const { stage, health, current_period: period } = habit.stats
  const top = frame.height * HIT_TOP[stage]
  const hitWidth = frame.width * HIT_WIDTH
  const label = `${habit.name}, ${period.count} of ${period.target} this period, ${healthWords[health]}`
  const streak = detail.data?.stats?.streak
  // The card: behind the plant, from over its tallest leaf to under the front of the board.
  const boardTop = (shelfY + BOARD.rest) * scale
  const cardTop = boardTop - CARD_ABOVE_BOARD
  const cardStyle = {
    left: x * scale - HOVER_CARD_WIDTH / 2,
    top: cardTop,
    width: HOVER_CARD_WIDTH,
    height: CARD_ABOVE_BOARD + BOARD.front * scale + CARD_BELOW_BOARD,
  }
  // The panel opens beside the card, not over it: half the card's width from the plant's middle, centred on the card's height.
  const plantStyle = {
    left: frame.x,
    top: frame.y,
    width: frame.width,
    height: frame.height,
    "--card-half": `${HOVER_CARD_WIDTH / 2}px`,
    "--card-top": `${cardTop - frame.y}px`,
    "--card-height": `${cardStyle.height}px`,
  } as CSSProperties

  return (
    <>
      {hot && <div className="garden-card__surface" style={cardStyle} aria-hidden="true" />}
      <div
        className="garden-plant"
        data-hot={hot}
        data-holding={hold.holding}
        data-menu={peekOpen}
        data-side={side}
        style={plantStyle}
      >
        <span className="garden-plant__ring" aria-hidden="true" />
        <div className="garden-plant__art" data-health={health} aria-hidden="true">
          <Preview seed={seed} stage={stage} wilt={wiltForHealth(health)} pot={pot} />
        </div>
        <button
          type="button"
          className="garden-plant__hit"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={peekOpen}
          style={{ left: (frame.width - hitWidth) / 2, top, width: hitWidth, height: frame.height - top }}
          {...hold.handlers}
          onPointerDown={(event: PointerEvent<HTMLElement>) => {
            pressedAt.current = Date.now()
            hold.handlers.onPointerDown(event)
          }}
          onClick={(event: MouseEvent<HTMLElement>) => {
            // A keyboard "click" has no press. A pointer click that was a hold does not open the panel.
            const held = event.detail !== 0 && pressedAt.current !== null && Date.now() - pressedAt.current > CLICK_MAX_MS
            pressedAt.current = null
            if (!held) onPeek()
          }}
          onPointerEnter={(event) => setHover(event.pointerType !== "touch")}
          onPointerLeave={() => { setHover(false); hold.handlers.onPointerLeave() }}
          onFocus={(event) => {
            try { setFocus(event.currentTarget.matches(":focus-visible")) } catch { setFocus(false) }
          }}
          onBlur={() => { setFocus(false); hold.handlers.onBlur() }}
        />
        {peekOpen && peek}
      </div>
      {hot && (
        <div className="garden-card" style={cardStyle}>
          <HabitCard habit={habit} today={today} streak={streak} />
        </div>
      )}
    </>
  )
}
