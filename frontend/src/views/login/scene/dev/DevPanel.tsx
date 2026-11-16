"use client"

import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"
import { POT_BANDS } from "@/pottedPlant/pots"
import { SCENE_POT_COLOR_NAMES } from "../scenePots"
import type { ScenePlant, ScenePotColor } from "../types"
import type { DevShow } from "./DevLayer"

const TOGGLES: { key: keyof DevShow; label: string }[] = [
  { key: "labels", label: "Plant labels" },
  { key: "bounds", label: "Plant boxes" },
  { key: "shelves", label: "Shelf boards" },
  { key: "grid", label: "100-unit grid" },
  { key: "safeZone", label: "Text area" },
  { key: "sunlight", label: "Sunlight" },
]

/** A labelled number input that ignores text that is not a number. */
function NumberField({ label, value, step = 1, min, max, onChange }: {
  label: string
  value: number
  step?: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="login-dev__field">
      <span>{label}</span>
      <input
        type="number" value={value} step={step} min={min} max={max}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber
          if (Number.isFinite(next)) onChange(next)
        }}
      />
    </label>
  )
}

export interface DevPanelProps {
  plants: readonly ScenePlant[]
  selected: ScenePlant | undefined
  show: DevShow
  onShow: (key: keyof DevShow, value: boolean) => void
  hideText: boolean
  onHideText: (value: boolean) => void
  problems: string[]
  status: string
  onChange: (patch: Partial<ScenePlant>) => void
  onPot: (patch: { color?: ScenePotColor | ""; band?: "none" | "stripe" | "" }) => void
  onNewSeed: () => void
  onCopyEntry: () => void
  onCopyAll: () => void
  onResetPlant: () => void
  onResetAll: () => void
  onDeselect: () => void
}

/** The dev tools' panel: what to show, any problems with the list, and the selected plant's controls. */
export function DevPanel(props: DevPanelProps) {
  const { selected } = props
  return (
    <aside className="login-dev" aria-label="Login scene dev tools">
      <h2 className="login-dev__title">Scene dev tools</h2>
      <p className="login-dev__hint">{props.plants.length} plants. Click a plant to edit it. Arrow keys nudge it (Shift for 10).</p>

      <fieldset className="login-dev__group">
        <legend>Show</legend>
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className="login-dev__check">
            <input type="checkbox" checked={props.show[key]} onChange={(event) => props.onShow(key, event.currentTarget.checked)} />
            {label}
          </label>
        ))}
        <label className="login-dev__check">
          <input type="checkbox" checked={props.hideText} onChange={(event) => props.onHideText(event.currentTarget.checked)} />
          Hide the words
        </label>
      </fieldset>

      {props.problems.length > 0 && (
        <div role="alert" className="login-dev__problems">
          <strong>{props.problems.length} problem{props.problems.length === 1 ? "" : "s"}</strong>
          <ul>{props.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </div>
      )}

      {selected ? (
        <fieldset className="login-dev__group" aria-label={"Edit " + selected.id}>
          <legend>{selected.id}</legend>
          <label className="login-dev__field">
            <span>Type</span>
            <select value={selected.type} onChange={(event) => props.onChange({ type: event.currentTarget.value as ScenePlant["type"] })}>
              {PLANT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
          </label>
          <label className="login-dev__field">
            <span>Stage</span>
            <select value={selected.stage} onChange={(event) => props.onChange({ stage: Number(event.currentTarget.value) as ScenePlant["stage"] })}>
              {[1, 2, 3, 4].map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </label>
          <label className="login-dev__field">
            <span>Wilt {selected.wilt}</span>
            <input type="range" min={0} max={1} step={0.05} value={selected.wilt}
              onChange={(event) => props.onChange({ wilt: Number(event.currentTarget.value) })} />
          </label>
          <NumberField label="Size" value={selected.size} step={5} min={20} max={800} onChange={(size) => props.onChange({ size })} />
          <div className="login-dev__row">
            <NumberField label="Seed" value={selected.seed} min={0} onChange={(seed) => props.onChange({ seed: Math.max(0, Math.round(seed)) })} />
            <button type="button" onClick={props.onNewSeed}>New seed</button>
          </div>
          <div className="login-dev__row">
            <NumberField label="x" value={selected.x} onChange={(x) => props.onChange({ x })} />
            <NumberField label="y" value={selected.y} onChange={(y) => props.onChange({ y })} />
          </div>
          <label className="login-dev__field">
            <span>Pot color</span>
            <select value={selected.pot?.color ?? ""} onChange={(event) => props.onPot({ color: event.currentTarget.value as ScenePotColor | "" })}>
              <option value="">from the seed</option>
              {SCENE_POT_COLOR_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="login-dev__field">
            <span>Pot band</span>
            <select value={selected.pot?.band ?? ""} onChange={(event) => props.onPot({ band: event.currentTarget.value as "none" | "stripe" | "" })}>
              <option value="">from the seed</option>
              {POT_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
            </select>
          </label>
          <label className="login-dev__check">
            <input type="checkbox" checked={selected.mirror === true} onChange={(event) => props.onChange({ mirror: event.currentTarget.checked })} />
            Mirrored
          </label>
          <div className="login-dev__row">
            <button type="button" onClick={props.onCopyEntry}>Copy this line</button>
            <button type="button" onClick={props.onResetPlant}>Reset</button>
            <button type="button" onClick={props.onDeselect}>Done</button>
          </div>
        </fieldset>
      ) : (
        <p className="login-dev__hint">No plant selected.</p>
      )}

      <div className="login-dev__row">
        <button type="button" onClick={props.onCopyAll}>Copy all lines</button>
        <button type="button" onClick={props.onResetAll}>Reset all</button>
      </div>
      <p role="status" className="login-dev__status">{props.status}</p>
    </aside>
  )
}
