"use client"

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { BOARD, PLANT_VIEW, POT_SINK, plantFrame } from "@/components/shelf/geometry"
import { useHoldToLog } from "@/components/useHoldToLog"
import { formatDate } from "@/lib/goal"
import { getHabit, habitKeys, type HabitWithStats } from "@/lib/habits"
import { habitSeed } from "@/pottedPlant/habitSeed"
import { plantTypeById } from "@/pottedPlant/plants/plantTypes"
import { wiltForHealth } from "@/pottedPlant/plants/staged/wilt"
import { potLookFromSeed } from "@/pottedPlant/pots"
import { ACTIONS_WIDTH, HOVER_CARD_WIDTH } from "./gardenLayout"
import { HabitCard, daysBetween } from "./HabitCard"

/** How long the pointer is held on a plant to log today, in milliseconds. */
export const HOLD_MS = 600

/**
 * A press that lasts longer than this, in milliseconds, is a hold and not a click: it never opens the
 * card, whether or not it was long enough to log (a finished habit cannot be logged, but is still held).
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
const CARD_ABOVE_BOARD = 300
const CARD_BELOW_BOARD = 92

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

/** What makes a plant a shared habit's: the people in it. Its card shows them, and its streak is not fetched. */
export interface SharedInfo {
  members: number
  max: number
}

export interface GardenPlantProps {
  habit: HabitWithStats
  userId: string
  today: string
  /** Set for a shared habit. */
  shared?: SharedInfo
  /** The middle of the pot and the board point it stands on, in layout units, and the pot's size in the same units. */
  x: number
  shelfY: number
  size: number
  /** Pixels per layout unit. */
  scale: number
  /** Whether holding the plant logs today: not for a habit that has finished, or while another log is being saved. */
  canLog: boolean
  /** Which side of the plant the open card grows toward, so it stays on the wall. */
  side: "left" | "right"
  /** Whether the card is open: clicked, so it holds the buttons. */
  peekOpen: boolean
  /** The buttons the card grows sideways to hold while peekOpen. */
  actions: ReactNode
  /** Click or tap. */
  onPeek: () => void
  /** Escape or a press outside the open card. */
  onClose: () => void
  /** A mouse or pen came onto this plant: any other plant's open card closes. */
  onHover: () => void
  /** The pointer was held on the plant long enough. */
  onHold: () => void
}

/**
 * One habit's plant on its shelf. At rest it shows only the plant: the name is in the button's label.
 *
 * Hover or keyboard focus: a soft, solid card appears behind the plant, with its name, what
 * is left, the streak and this period's progress. It stays while the plant is held. Click: the same
 * card grows to one side, out toward the nearer edge of the wall, to hold the buttons (Log today and
 * the rest), and closes on Escape or a press outside it. Hold: a ring fills and today is logged. A touch has no hover, so a tap opens the card,
 * as a sheet at the bottom of the screen (see garden.css).
 */
export function GardenPlant({ habit, userId, today, shared, x, shelfY, size, scale, side, canLog, peekOpen, actions, onPeek, onClose, onHover, onHold }: GardenPlantProps) {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const hold = useHoldToLog(canLog ? onHold : undefined, HOLD_MS)
  // When the pointer went down, so a click that comes after a long press can be told from a real one.
  const pressedAt = useRef<number | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const plant = plantTypeById(habit.plant_type)
  // The card stays open while the plant is held and while it is open, even with the pointer gone.
  const hot = hover || focus || peekOpen || hold.holding

  // Open: the first button takes focus, and Escape or a press outside the card (not on a plant's own
  // button, which opens its own card or closes this one) closes it.
  useEffect(() => {
    if (!peekOpen) return
    card.current?.querySelector<HTMLElement>("button, a")?.focus()
    function outside(event: globalThis.PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (card.current?.contains(target) || target.closest(".garden-plant__hit")) return
      onClose()
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", escape)
    }
  }, [peekOpen, onClose])

  // The streak is not in the list, so it is fetched the first time it is wanted.
  const detail = useQuery({
    queryKey: habitKeys.detail(userId, habit.id),
    queryFn: () => getHabit(habit.id),
    enabled: hot && !shared,
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
  // Open, it is wider by the buttons' column, which is on the side the card grows toward: the plant's part stays put.
  const extra = peekOpen ? ACTIONS_WIDTH : 0
  const cardStyle = {
    left: x * scale - HOVER_CARD_WIDTH / 2 - (side === "left" ? extra : 0),
    top: cardTop,
    width: HOVER_CARD_WIDTH + extra,
    height: CARD_ABOVE_BOARD + BOARD.front * scale + CARD_BELOW_BOARD,
    "--card-w": `${HOVER_CARD_WIDTH}px`,
  } as CSSProperties
  const plantStyle = {
    left: frame.x,
    top: frame.y,
    width: frame.width,
    height: frame.height,
    "--hold-ms": `${HOLD_MS}ms`,
  } as CSSProperties

  return (
    <>
      {hot && <div className="garden-card__surface" style={cardStyle} aria-hidden="true" />}
      <div
        className="garden-plant"
        data-hot={hot}
        data-holding={hold.holding}
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
            // A keyboard "click" has no press. A pointer click that was a hold does not open the card.
            const held = event.detail !== 0 && pressedAt.current !== null && Date.now() - pressedAt.current > CLICK_MAX_MS
            pressedAt.current = null
            if (!held) onPeek()
          }}
          onPointerEnter={(event) => {
            setHover(event.pointerType !== "touch")
            if (event.pointerType !== "touch") onHover()
          }}
          onPointerLeave={() => { setHover(false); hold.handlers.onPointerLeave() }}
          onFocus={(event) => {
            try { setFocus(event.currentTarget.matches(":focus-visible")) } catch { setFocus(false) }
          }}
          onBlur={() => { setFocus(false); hold.handlers.onBlur() }}
        />
      </div>
      {hot && (
        <div
          ref={card}
          className="garden-card"
          data-open={peekOpen}
          data-side={side}
          role={peekOpen ? "dialog" : undefined}
          aria-label={peekOpen ? habit.name : undefined}
          style={cardStyle}
        >
          <HabitCard habit={habit} today={today} streak={streak} members={shared?.members} />
          {peekOpen && actions}
        </div>
      )}
    </>
  )
}
