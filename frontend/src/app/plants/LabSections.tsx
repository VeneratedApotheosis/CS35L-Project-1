"use client"

import { useRef, useState } from "react"
import { Dices, Leaf, RotateCcw } from "lucide-react"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"
import { WILT } from "@/pottedPlant/plants/staged/wilt"
import { Pothos } from "@/pottedPlant/plants/pothos/Pothos"
import { POT_PALETTES, potLookFromSeed } from "@/pottedPlant/pots"

type Stage = 1 | 2 | 3 | 4
const HEALTH_STATES = [
  { id: "healthy", label: "Healthy" },
  { id: "slightly_wilted", label: "Slightly wilted" },
  { id: "wilted", label: "Wilted" },
] as const
type Health = (typeof HEALTH_STATES)[number]["id"]

const SECTION_SEED = 42

function LabSection({ title, description, action, children }: {
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2">{title}</h2>
          <p className="text-body-sm text-secondary max-w-prose">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

/** #152: every plant type in each health state, side by side, and at any wilt amount in between. */
export function WiltedLookSection() {
  const [health, setHealth] = useState<Health | "all" | "custom">("all")
  const [custom, setCustom] = useState(0.5)
  const shown = health === "all" ? HEALTH_STATES : HEALTH_STATES.filter((state) => state.id === health)
  const rows = health === "custom"
    ? [{ id: "custom", label: "Wilt amount " + Math.round(custom * 100) + "%", wilt: custom }]
    : shown.map((state) => ({ id: state.id, label: state.label, wilt: WILT.forHealth[state.id] }))

  return (
    <LabSection
      title="Wilted look"
      description="Every plant in the three health states. As a plant wilts its leaves droop, until the average leaf is almost horizontal, and about half of the leaves turn brown, a quarter of them dark brown. The pot never changes. Drooped leaves stay inside the pot's side limits. Lotus is not on the stage engine yet, so it doesn't wilt."
      action={
        <div role="group" aria-label="Health state to show" className="flex flex-wrap gap-2">
          {[{ id: "all", label: "All states" }, ...HEALTH_STATES, { id: "custom", label: "Custom amount" }].map((state) => (
            <Button key={state.id} size="sm" variant={health === state.id ? "primary" : "secondary"}
              aria-pressed={health === state.id} onClick={() => setHealth(state.id as typeof health)}>
              {state.label}
            </Button>
          ))}
        </div>
      }
    >
      {health === "custom" && (
        <label className="flex max-w-sm flex-col gap-3">
          <span className="text-caption">Wilt amount {Math.round(custom * 100)}%</span>
          <input type="range" min={0} max={1} step={0.05} value={custom}
            onChange={(event) => setCustom(Number(event.target.value))}
            className="w-full accent-[var(--color-primary-selected)]" />
        </label>
      )}
      <div className="flex flex-col gap-6">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-3">
            <h3 className="text-h3">{row.label}</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {PLANT_TYPES.map(({ id, label, Preview }) => (
                <Card key={id} className="flex flex-col items-center gap-2 !p-4">
                  <div className="w-full">
                    <Preview seed={SECTION_SEED} stage={4} wilt={row.wilt} />
                  </div>
                  <p className="text-caption">{label}</p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LabSection>
  )
}

/**
 * #153: a plant moves up a stage after the user's own action. Never on load,
 * and instant when the user prefers reduced motion.
 */
export function StageUpSection() {
  const [plantId, setPlantId] = useState<string>(PLANT_TYPES[0].id)
  const [stage, setStage] = useState<Stage>(1)
  const [seed, setSeed] = useState(SECTION_SEED)
  const art = useRef<HTMLDivElement>(null)
  const plant = PLANT_TYPES.find((type) => type.id === plantId) ?? PLANT_TYPES[0]
  const { Preview } = plant

  /** Grow from a smaller picture to the new size, from the pot up. */
  function play() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    art.current?.animate(
      [{ transform: "scale(0.78)", opacity: 0.6 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 600, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    )
  }
  function logActivity() {
    if (stage === 4) return
    setStage((stage + 1) as Stage)
    play()
  }
  function reset() {
    setStage(1)
  }

  return (
    <LabSection
      title="Stage-up animation"
      description="Log an activity to move the plant up a stage. The animation runs only after you press the button, never when the page loads. With reduced motion turned on in your system, the change is instant. This is a stand-in scale effect for #153. The real one grows the plant from its old size to its new size."
      action={
        <div role="group" aria-label="Plant to animate" className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-body-sm text-muted">Plant</span>
            <select className="select" value={plantId} onChange={(event) => { setPlantId(event.target.value); setStage(1) }}>
              {PLANT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
          </label>
          <Button variant="secondary" icon={Dices} onClick={() => { setSeed(Math.floor(Math.random() * 100000)); setStage(1) }}>
            New seed
          </Button>
        </div>
      }
    >
      <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-8">
        <div className="w-full max-w-xs">
          <div ref={art} className="w-full origin-bottom">
            <Preview seed={seed} stage={stage} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <p className="text-h3">Stage {stage} of 4</p>
          <p className="text-body-sm text-secondary" role="status">
            {stage === 4 ? "Fully grown. Reset to watch it again." : "Ready to grow."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button icon={Leaf} onClick={logActivity} disabled={stage === 4}>Log activity</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={reset} disabled={stage === 1}>Reset</Button>
          </div>
        </div>
      </Card>
    </LabSection>
  )
}

/**
 * #154: plants and pots on the dark surfaces, whatever theme the page is in.
 * The wrapper sets data-theme="dark", so every token inside it is the dark one.
 */
export function DarkThemeSection() {
  return (
    <LabSection
      title="Dark theme"
      description="Every plant and every pot palette on the dark surfaces, whatever theme the page is using. Check that no color disappears, and that the pot's shadow is still visible."
    >
      <div data-theme="dark" className="flex flex-col gap-8 rounded-[var(--radius-md)] bg-[var(--color-background)] p-6 text-[var(--color-text)]">
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Plants</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {PLANT_TYPES.map(({ id, label, Preview }) => (
              <Card key={id} className="flex flex-col items-center gap-2 !p-4">
                <div className="w-full"><Preview seed={SECTION_SEED} stage={4} /></div>
                <p className="text-caption">{label}</p>
              </Card>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Pot palettes</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {POT_PALETTES.map((palette, index) => (
              <Card key={palette.name} className="flex flex-col items-center gap-2 !p-4">
                <Pothos seed={SECTION_SEED} stage={3} pot={{ ...potLookFromSeed(SECTION_SEED), palette: index }} className="w-full" />
                <p className="text-caption">{palette.name}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </LabSection>
  )
}
