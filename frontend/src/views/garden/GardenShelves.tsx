"use client"

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { DeleteHabitDialog } from "@/components/DeleteHabit"
import { ShelfBoard } from "@/components/shelf/ShelfBoard"
import { BOARD, PLANT_VIEW, POT_SINK, plantFrame } from "@/components/shelf/geometry"
import type { HabitWithStats } from "@/lib/habits"
import { PottedPlant } from "@/pottedPlant/PottedPlant"
import { potLookFromSeed } from "@/pottedPlant/pots"
import {
  GARDEN_BRACKET_INSET,
  GARDEN_POT_SIZE,
  gardenCols,
  gardenExtra,
  gardenLayout,
  gardenScale,
  peekSide,
} from "./gardenLayout"
import { GardenPlant } from "./GardenPlant"
import { HabitPeek } from "./HabitPeek"
import { LogDayDialog } from "./LogDayDialog"

export interface GardenShelvesProps {
  habits: readonly HabitWithStats[]
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
function inOrder(habits: readonly HabitWithStats[]) {
  return [...habits].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
}

/** What every shelf needs from the page: the width, which plant has its panel open, and what the buttons do. */
interface Shared {
  userId: string
  today: string
  /** The width of the page's wall, in pixels, and how many pots fit across it. */
  width: number
  cols: number
  loggingDisabled: boolean
  peekId: string | null
  closePeek: () => void
  togglePeek: (id: string) => void
  logToday: (habit: HabitWithStats) => void
  logAnotherDay: (habit: HabitWithStats) => void
  remove: (habit: HabitWithStats) => void
}

/** Whether a plant can be logged now: not once it has finished, and not before today's date is known. */
const loggable = (habit: HabitWithStats, today: string) => habit.stats.state !== "expired" && today !== ""

/** One group of shelves: the plants in it, and, for the active ones, the empty pot at the end that adds a habit. */
function ShelfGroup({ habits, withAdd, shared }: { habits: readonly HabitWithStats[]; withAdd: boolean; shared: Shared }) {
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
    <div className="garden-wall">
      <div className="garden-wall__canvas" style={{ width: pixelsOf(layout.width), height: pixelsOf(layout.height) }}>
        <svg className="garden-wall__svg" width={pixelsOf(layout.width)} height={pixelsOf(layout.height)}
          viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false">
          {layout.shelves.map((shelf) => <ShelfBoard key={shelf.y} shelf={shelf} bracketInset={GARDEN_BRACKET_INSET} />)}
        </svg>
        {habits.map((habit, index) => {
          const slot = layout.slots[index]
          const can = loggable(habit, shared.today)
          return (
            <GardenPlant key={habit.id} habit={habit} userId={shared.userId} today={shared.today}
              x={slot.x} shelfY={layout.shelves[slot.shelf].y - BOARD.rest} size={GARDEN_POT_SIZE} scale={scale}
              side={peekSide(canvasLeft + pixelsOf(slot.x), shared.width)}
              canLog={can && !shared.loggingDisabled}
              peekOpen={shared.peekId === habit.id}
              peek={
                <HabitPeek habit={habit} userId={shared.userId} today={shared.today}
                  canLog={can} loggingDisabled={shared.loggingDisabled}
                  onLogToday={() => shared.logToday(habit)}
                  onLogAnotherDay={() => shared.logAnotherDay(habit)}
                  onDelete={() => shared.remove(habit)}
                  onClose={shared.closePeek} />
              }
              onPeek={() => shared.togglePeek(habit.id)}
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
 * active ones that adds a habit, and the finished habits on their own shelves beneath. At most
 * three pots stand on a shelf, fewer on a narrow screen, and more habits just add shelves. The
 * pots are the login wall's, 1.5 times as big on desktop, scaled together with their shelves on narrow walls. Everything else is
 * in GardenPlant, the peek panel and the date dialog.
 */
export function GardenShelves({ habits, userId, today, loggingDisabled, onLogToday, onLogOn }: GardenShelvesProps) {
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
    togglePeek: (id) => setPeekId((open) => (open === id ? null : id)),
    logToday: (habit) => { setPeekId(null); if (loggable(habit, today) && !loggingDisabled) onLogToday(habit.id) },
    logAnotherDay: (habit) => { setPeekId(null); setLogDayId(habit.id) },
    remove: (habit) => { setPeekId(null); setDeleteId(habit.id) },
  }
  const logDay = byId(logDayId)
  const doomed = byId(deleteId)

  return (
    <div ref={wall} className="garden-shelves">
      {active.length > 0 && <p className="garden-touch-hint">Tap a plant for details. Touch and hold to log today.</p>}
      <ShelfGroup habits={active} withAdd shared={shared} />
      {finished.length > 0 && (
        <section aria-labelledby="garden-finished" className="garden-finished">
          <h2 id="garden-finished" className="text-h2">Completed garden</h2>
          <ShelfGroup habits={finished} withAdd={false} shared={shared} />
        </section>
      )}

      <LogDayDialog habit={logDay} today={today} onSave={onLogOn} onClose={() => setLogDayId(null)} />
      <DeleteHabitDialog id={doomed?.id ?? ""} name={doomed?.name ?? ""} open={doomed !== null} onClose={() => setDeleteId(null)} />
    </div>
  )
}
