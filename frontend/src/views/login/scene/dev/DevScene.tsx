"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { round1 } from "../geometry"
import { LoginScene } from "../LoginScene"
import { SCENE_PLANTS } from "../plants"
import { SHELVES } from "../room"
import type { ScenePlant, ScenePotColor } from "../types"
import { validateScene } from "../validate"
import { DevLayer, type DevShow } from "./DevLayer"
import { DevPanel } from "./DevPanel"
import { formatPlant, formatPlants } from "./plantLine"

/** Keys that nudge the selected plant, and which way each one moves it. */
const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/** Whether a key press is going to a form field, which should keep its arrow keys. */
function typingInField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
}

/**
 * The login scene with the dev tools on: a copy of the plant list that can be
 * edited, labels and guides drawn on the scene, and a panel to change the plant
 * that was clicked. Edits live only on the page; "Copy" puts them on the
 * clipboard to paste back into plants.ts.
 */
export default function DevScene({ hideText, onHideText }: { hideText: boolean; onHideText: (value: boolean) => void }) {
  const [plants, setPlants] = useState<ScenePlant[]>(() => [...SCENE_PLANTS])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [show, setShow] = useState<DevShow>({ labels: true, bounds: false, shelves: false, grid: false, safeZone: false, sunlight: true })
  const [status, setStatus] = useState("")

  const selected = plants.find((plant) => plant.id === selectedId)
  const problems = useMemo(() => validateScene(plants, SHELVES), [plants])

  const change = useCallback((id: string, patch: Partial<ScenePlant>) => {
    setPlants((current) => current.map((plant) => (plant.id === id ? { ...plant, ...patch } : plant)))
    setStatus("")
  }, [])

  // Arrow keys move the selected plant, unless the user is typing in a field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !typingInField(event.target)) {
        setSelectedId(null)
        return
      }
      const move = NUDGE[event.key]
      if (!move || !selectedId || typingInField(event.target)) return
      event.preventDefault()
      const step = event.shiftKey ? 10 : 1
      setPlants((current) =>
        current.map((plant) =>
          plant.id === selectedId ? { ...plant, x: round1(plant.x + move[0] * step), y: round1(plant.y + move[1] * step) } : plant,
        ),
      )
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId])

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(done)
    } catch {
      setStatus("Could not copy. Select and copy the line from the console instead.")
      console.log(text)
    }
  }

  function setPot(patch: { color?: ScenePotColor | ""; band?: "none" | "stripe" | "" }) {
    if (!selected) return
    const pot = { ...selected.pot }
    if ("color" in patch) {
      if (patch.color) pot.color = patch.color
      else delete pot.color
    }
    if ("band" in patch) {
      if (patch.band) pot.band = patch.band
      else delete pot.band
    }
    change(selected.id, { pot: Object.keys(pot).length > 0 ? pot : undefined })
  }

  return (
    <>
      <LoginScene
        plants={plants}
        sunlight={show.sunlight}
        overlay={<DevLayer plants={plants} selectedId={selectedId} onSelect={setSelectedId} show={show} />}
      />
      <DevPanel
        plants={plants}
        selected={selected}
        show={show}
        onShow={(key, value) => setShow((current) => ({ ...current, [key]: value }))}
        hideText={hideText}
        onHideText={onHideText}
        problems={problems}
        status={status}
        onChange={(patch) => selected && change(selected.id, patch)}
        onPot={setPot}
        onNewSeed={() => selected && change(selected.id, { seed: 1 + Math.floor(Math.random() * 99999) })}
        onCopyEntry={() => selected && void copy(formatPlant(selected), "Copied the line for " + selected.id + ".")}
        onCopyAll={() => void copy(formatPlants(plants), "Copied all " + plants.length + " lines.")}
        onResetPlant={() => {
          const original = SCENE_PLANTS.find((plant) => plant.id === selectedId)
          if (original && selectedId) change(selectedId, { ...original })
        }}
        onResetAll={() => {
          setPlants([...SCENE_PLANTS])
          setStatus("Reset to plants.ts.")
        }}
        onDeselect={() => setSelectedId(null)}
      />
    </>
  )
}
