"use client"

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { DeleteHabitDialog } from "@/components/DeleteHabit"
import { ShelfBoard } from "@/components/shelf/ShelfBoard"
import { BOARD, PLANT_VIEW, POT_SINK, plantFrame } from "@/components/shelf/geometry"
import type { HabitWithStats } from "@/lib/habits"
import type { SharedGardenHabit } from "@/lib/sharedHabits"
import { PottedPlant } from "@/pottedPlant/PottedPlant"
import { potLookFromSeed } from "@/pottedPlant/pots"
import {
  GARDEN_BRACKET_INSET,
  GARDEN_POT_SIZE,
  gardenCols,
  peekSide,
  gardenExtra,
  gardenLayout,
  gardenScale,
} from "./gardenLayout"
import { GardenPlant, type SharedInfo } from "./GardenPlant"
import { GardenSection } from "./GardenSection"
import { HabitActions } from "./HabitActions"
import { LogDayDialog } from "./LogDayDialog"

/** The habits shared with other people: their own section of the Garden, on red shelves. */
export interface SharedShelves {
  habits: readonly SharedGardenHabit[]
  /** The count beside the title, or undefined while more are still to be loaded. */
  meta?: string
  /** Under the shelves: an error to retry, or the button that loads more. */
  footer?: ReactNode
}

export interface GardenShelvesProps {
  /** Hidden when there are none, e.g. for an account that only has shared habits. */
  showPersonal?: boolean
  habits: readonly HabitWithStats[]
  /** Under My habits' shelves: the button that loads more. */
  habitsFooter?: ReactNode
  sharedHabits?: SharedShelves
  userId: string
  /** Today in the profile's timezone, or "" until it is known. */
  today: string
  /** True while a log is being saved: logging is off so two cannot overlap. */
  loggingDisabled: boolean
  onLogToday: (habitId: string) => void
  /** Logs another day. It throws if that fails. */
  onLogOn: (habitId: string, date: string) => Promise<void>
}

/** Habits in the order they were made, so a plant keeps its place and a new one goes at the end. */
function inOrder<T extends { id: string; created_at: string }>(habits: readonly T[]) {
  return [...habits].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
}

/**
 * A shared habit as the shelves draw it: the plant is the group's (its stage and health), and the
 * card's period is the caller's own, as the Garden has always shown them.
 */
function shelved(habit: SharedGardenHabit): HabitWithStats {
  const { own_stats: own, stats: group } = habit
  return { ...habit, stats: { ...group, state: own.state, current_period: own.current_period, overall_progress: own.overall_progress } }
}

/** What every shelf needs from the page: the width, which plant has its card open, and what the buttons do. */
interface Shared {
  userId: string
  today: string
  /** The width of the page's wall, in pixels, and how many pots fit across it. */
  width: number
  cols: number
  loggingDisabled: boolean
  peekId: string | null
  closePeek: () => void
  /** The pointer came onto a plant: the open card of any other plant closes. */
  hoverPlant: (id: string) => void
  togglePeek: (id: string) => void
  logToday: (habit: HabitWithStats) => void
  logAnotherDay: (habit: HabitWithStats) => void
  remove: (habit: HabitWithStats) => void
}

/** Whether a plant can be logged now: not once it has finished, and not before today's date is known. */
const loggable = (habit: HabitWithStats, today: string) => habit.stats.state !== "expired" && today !== ""

/** One group of shelves: the plants in it, and, for the active ones, the empty pot at the end that adds a habit. */
function ShelfGroup({ habits, withAdd, shared, shares }: {
  habits: readonly HabitWithStats[]
  withAdd: boolean
  shared: Shared
  /** For the shared habits' shelves (which are red): each habit's people and its own today. */
  shares?: ReadonlyMap<string, SharedInfo & { today: string }>
}) {
  const count = habits.length + (withAdd ? 1 : 0)
  const scale = gardenScale(shared.width)
  const extra = gardenExtra(shared.width, shared.cols)
  const layout = useMemo(() => gardenLayout(count, shared.cols, extra), [count, shared.cols, extra])
  const pixelsOf = (units: number) => units * scale
  // The canvas is centred in the wall, so a plant's place in the wall is its place in the canvas and the space before it.
  const canvasLeft = Math.max(0, (shared.width - pixelsOf(layout.width)) / 2)
  const addSlot = withAdd ? layout.slots[habits.length] : null
  // The empty pot stands as low as the plants' pots do.
  const addFrame = addSlot
    ? plantFrame(pixelsOf(addSlot.x), pixelsOf(layout.shelves[addSlot.shelf].y - BOARD.rest + POT_SINK), pixelsOf(GARDEN_POT_SIZE))
    : null
  const addPot = { ...potLookFromSeed(7), shadowLift: (POT_SINK * PLANT_VIEW.width) / GARDEN_POT_SIZE }

  return (
    <div className="garden-wall" data-kind={shares ? "shared" : undefined}>
      <div className="garden-wall__canvas" style={{ width: pixelsOf(layout.width), height: pixelsOf(layout.height) }}>
        <svg className="garden-wall__svg" width={pixelsOf(layout.width)} height={pixelsOf(layout.height)}
          viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false">
          {layout.shelves.map((shelf) => <ShelfBoard key={shelf.y} shelf={shelf} bracketInset={GARDEN_BRACKET_INSET} />)}
        </svg>
        {habits.map((habit, index) => {
          const slot = layout.slots[index]
          const share = shares?.get(habit.id)
          // A shared habit is logged on its own page, not from the shelf.
          const can = !share && loggable(habit, shared.today)
          return (
            <GardenPlant key={habit.id} habit={habit} userId={shared.userId} today={share?.today ?? shared.today} shared={share}
              x={slot.x} shelfY={layout.shelves[slot.shelf].y - BOARD.rest} size={GARDEN_POT_SIZE} scale={scale}
              side={peekSide(canvasLeft + pixelsOf(slot.x), shared.width)}
              canLog={can && !shared.loggingDisabled}
              peekOpen={shared.peekId === habit.id}
              actions={
                <HabitActions habit={habit} userId={shared.userId} shared={share}
                  canLog={can} loggingDisabled={shared.loggingDisabled}
                  onLogToday={() => shared.logToday(habit)}
                  onLogAnotherDay={() => shared.logAnotherDay(habit)}
                  onDelete={() => shared.remove(habit)}
                  onClose={shared.closePeek} />
              }
              onPeek={() => shared.togglePeek(habit.id)}
              onClose={shared.closePeek}
              onHover={() => shared.hoverPlant(habit.id)}
              onHold={() => shared.logToday(habit)} />
          )
        })}
        {addFrame && (
          <>
            <div className="garden-add" aria-hidden="true"
              style={{ left: addFrame.x, top: addFrame.y, width: addFrame.width, height: addFrame.height }}>
              <PottedPlant look={addPot} title="Empty pot">{null}</PottedPlant>
              <span className="garden-add__plus"><Plus size={40} /></span>
            </div>
            <Link href="/create" className="garden-add__hit" aria-label="Add a habit"
              style={{ left: addFrame.x + addFrame.width * 0.19, top: addFrame.y + addFrame.height * 0.45, width: addFrame.width * 0.62, height: addFrame.height * 0.55 }} />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * The Garden: every habit's plant on a wall of shelves, with the empty pot at the end of the
 * active ones that adds a habit, and the finished habits on their own shelves beneath, each in a
 * section. At most four pots stand on a shelf, fewer on a narrow
 * screen, and more habits just add shelves. The pots are the login wall's, 1.1 times as big on desktop, scaled together with their shelves on narrow walls. Everything else is
 * in GardenPlant, its buttons and the date dialog.
 */
export function GardenShelves({ showPersonal = true, habits, habitsFooter, sharedHabits, userId, today, loggingDisabled, onLogToday, onLogOn }: GardenShelvesProps) {
  const wall = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [peekId, setPeekId] = useState<string | null>(null)
  const [logDayId, setLogDayId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useLayoutEffect(() => {
    const element = wall.current
    if (!element) return
    setWidth(element.clientWidth)
    if (typeof ResizeObserver === "undefined") return
    const watch = new ResizeObserver(() => setWidth(element.clientWidth))
    watch.observe(element)
    return () => watch.disconnect()
  }, [])

  const ordered = useMemo(() => inOrder(habits), [habits])
  const active = useMemo(() => ordered.filter((habit) => habit.stats.state !== "expired"), [ordered])
  const finished = useMemo(() => ordered.filter((habit) => habit.stats.state === "expired"), [ordered])

  const sharedOrdered = useMemo(() => inOrder(sharedHabits?.habits ?? []), [sharedHabits?.habits])
  const sharedShelved = useMemo(() => sharedOrdered.map(shelved), [sharedOrdered])
  const shares = useMemo(
    () => new Map(sharedOrdered.map((habit) => [habit.id, { members: habit.member_count, max: habit.max_members, today: habit.own_today }])),
    [sharedOrdered],
  )

  const closePeek = useCallback(() => setPeekId(null), [])
  const byId = (id: string | null) => ordered.find((habit) => habit.id === id) ?? null
  const shared: Shared = {
    userId,
    today,
    width,
    cols: gardenCols(width),
    loggingDisabled,
    peekId,
    closePeek,
    hoverPlant: (id) => setPeekId((open) => (open === id ? open : null)),
    togglePeek: (id) => setPeekId((open) => (open === id ? null : id)),
    logToday: (habit) => { setPeekId(null); if (loggable(habit, today) && !loggingDisabled) onLogToday(habit.id) },
    logAnotherDay: (habit) => { setPeekId(null); setLogDayId(habit.id) },
    remove: (habit) => { setPeekId(null); setDeleteId(habit.id) },
  }
  const logDay = byId(logDayId)
  const doomed = byId(deleteId)

  return (
    <div className="garden-shelves">
      {showPersonal && (
        <GardenSection title="My habits" meta={`${active.length}`}>
          {active.length > 0 && <p className="garden-touch-hint">Tap a plant for details. Touch and hold to log today.</p>}
          <div ref={wall}>
            <ShelfGroup habits={active} withAdd shared={shared} />
          </div>
          {habitsFooter}
        </GardenSection>
      )}
      {showPersonal && finished.length > 0 && (
        <GardenSection title="Completed garden" meta={`${finished.length}`}>
          <ShelfGroup habits={finished} withAdd={false} shared={shared} />
        </GardenSection>
      )}
      {sharedHabits && (
        <GardenSection title="Shared habits" meta={sharedHabits.meta}>
          <div ref={showPersonal ? undefined : wall}>
            {sharedShelved.length > 0 && <ShelfGroup habits={sharedShelved} withAdd={false} shared={shared} shares={shares} />}
          </div>
          {sharedHabits.footer}
        </GardenSection>
      )}

      <LogDayDialog habit={logDay} today={today} onSave={onLogOn} onClose={() => setLogDayId(null)} />
      <DeleteHabitDialog id={doomed?.id ?? ""} name={doomed?.name ?? ""} open={doomed !== null} onClose={() => setDeleteId(null)} />
    </div>
  )
}
