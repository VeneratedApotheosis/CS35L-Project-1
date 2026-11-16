"use client"

import { useState } from "react"
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
const ALL_PLANTS = "all"

const SECTION_SEED = 42

function LabSection({ title, description, action, children }: {
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
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

function PlantCell({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 !p-4">
      <div className="w-full">{children}</div>
      <p className="text-caption">{label}</p>
    </Card>
  )
}

/** #152: one plant in its three health states, or every plant fully wilted. */
export function WiltedLookSection() {
  const [plantId, setPlantId] = useState<string>(PLANT_TYPES[0].id)
  const single = PLANT_TYPES.find((type) => type.id === plantId)

  return (
    <LabSection
      title="Wilted look"
      description="A wilting plant bends its stems and droops its leaves until they hang almost flat. About half of the leaves turn brown. The pot never changes."
      action={
        <label className="flex items-center gap-2">
          <span className="text-body-sm text-muted">Plant</span>
          <select className="select" value={plantId} onChange={(event) => setPlantId(event.target.value)}>
            {PLANT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            <option value={ALL_PLANTS}>All plants (wilted)</option>
          </select>
        </label>
      }
    >
      {single ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HEALTH_STATES.map(({ id, label }) => (
            <PlantCell key={id} label={label}>
              <single.Preview seed={SECTION_SEED} stage={4} wilt={WILT.forHealth[id]} />
            </PlantCell>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PLANT_TYPES.map(({ id, label, Preview }) => (
            <PlantCell key={id} label={label}>
              <Preview seed={SECTION_SEED} stage={4} wilt={WILT.forHealth.wilted} />
            </PlantCell>
          ))}
        </div>
      )}
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
  const plant = PLANT_TYPES.find((type) => type.id === plantId) ?? PLANT_TYPES[0]
  const { Preview } = plant

  function logActivity() {
    if (stage < 4) setStage((stage + 1) as Stage)
  }

  return (
    <LabSection
      title="Stage-up animation"
      description="Press Log activity to move up a stage. The leaves spring into their new places, with bursts around the plant. It runs only on your action, and is instant if reduced motion is on."
      action={
        <div className="flex flex-wrap items-center gap-2">
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
          <Preview seed={seed} stage={stage} />
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <p className="text-h3">Stage {stage} of 4</p>
          <p className="text-body-sm text-secondary" role="status">
            {stage === 4 ? "Fully grown. Reset to watch it again." : "Ready to grow."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button icon={Leaf} onClick={logActivity} disabled={stage === 4}>Log activity</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={() => setStage(1)} disabled={stage === 1}>Reset</Button>
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
      description="Every plant and pot palette on the dark surfaces, whatever theme the page uses. Each pot keeps a visible shadow."
    >
      <div data-theme="dark" className="flex flex-col gap-6 rounded-[var(--radius-md)] bg-[var(--color-background)] p-6 text-[var(--color-text)]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PLANT_TYPES.map(({ id, label, Preview }) => (
            <PlantCell key={id} label={label}>
              <Preview seed={SECTION_SEED} stage={4} />
            </PlantCell>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {POT_PALETTES.map((palette, index) => (
            <PlantCell key={palette.name} label={palette.name}>
              <Pothos seed={SECTION_SEED} stage={3} pot={{ ...potLookFromSeed(SECTION_SEED), palette: index }} className="w-full" />
            </PlantCell>
          ))}
        </div>
      </div>
    </LabSection>
  )
}
