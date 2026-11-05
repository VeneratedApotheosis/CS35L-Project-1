"use client"

import { useMemo, useState } from "react"
import { Dices } from "lucide-react"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { LeafShape } from "@/plants/pothos/LeafShape"
import { Pilea } from "@/plants/Pilea"
import { PeaceLily } from "@/plants/peaceLily"
import { Pothos } from "@/plants/pothos/Pothos"
import { randomLeafSpec } from "@/plants/pothos/leaf"
import { STAGES } from "@/plants/genome"
import { POT_PALETTES } from "@/plants/pot"
import { mulberry32 } from "@/plants/rng"

const GALLERY_SEEDS = [3, 11, 24, 42, 57, 86, 101, 2025]
const COMPARE_SCALES = [0.4, 0.6, 0.8, 1]
const COMPARE_SIZES = [0.6, 0.8, 1, 1.3, 1.6]
const STAGE_NUMBERS = [1, 2, 3, 4] as const

/** The plants the four-stages section can show and grow another of. Each keeps its own seed. */
const PLANTS = [
  {
    id: "pothos",
    label: "Pothos",
    description:
      "Four stages, no in-betweens. The last is 3.6 times the width of the first, grows evenly in every direction, and never has more than 6 leaves, each on a visible stem. Scale resizes the whole picture and moves nothing inside it.",
    stageNames: STAGES.map((s) => s.name),
  },
  {
    id: "peaceLily",
    label: "Peace lily",
    description:
      "Long, pointed leaves on the same stage engine as the pothos, with the outer leaves fanning outward. White flowers appear as closed buds in stage 3 and open in stage 4.",
    stageNames: ["Sprout", "Young", "Budding", "Blooming"],
  },
  {
    id: "pilea",
    label: "Pilea",
    description:
      "Still on the older continuous-growth engine; it will move to the stage engine later. Round coin leaves on thin stalks, with baby plants beside the main one.",
    stageNames: STAGES.map((s) => s.name),
  },
] as const
type PlantId = (typeof PLANTS)[number]["id"]

const FIRST_SEED = 7
const SEED_LIMIT = 100000

function Section({
  title,
  description,
  action,
  children,
}: {
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

function LeafLab({ seed }: { seed: number }) {
  const specs = useMemo(() => {
    const rng = mulberry32(seed)
    return Array.from({ length: 10 }, () => randomLeafSpec(rng))
  }, [seed])

  return (
    <Card className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {specs.map((spec, i) => (
        <svg key={i} viewBox="-30 -64 60 76" className="w-full" aria-label={"Leaf " + (i + 1)} role="img">
          <LeafShape spec={spec} length={56} clipId={"lab-" + seed + "-" + i} />
        </svg>
      ))}
    </Card>
  )
}

export default function PlantLab() {
  const [seeds, setSeeds] = useState<Record<PlantId, number>>({
    pothos: FIRST_SEED,
    peaceLily: FIRST_SEED,
    pilea: FIRST_SEED,
  })
  const [chosen, setChosen] = useState<PlantId>("pothos")
  const [scale, setScale] = useState(1)

  const plant = PLANTS.find((p) => p.id === chosen)!
  const growAnother = () =>
    setSeeds((current) => ({ ...current, [chosen]: Math.floor(Math.random() * SEED_LIMIT) }))
  const growPicker = (
    <div role="group" aria-label="Plant to grow" className="flex flex-wrap items-center gap-2">
      {PLANTS.map((p) => (
        <Button
          key={p.id}
          size="sm"
          variant={chosen === p.id ? "primary" : "secondary"}
          aria-pressed={chosen === p.id}
          onClick={() => setChosen(p.id)}
        >
          {p.label}
        </Button>
      ))}
      <Button variant="secondary" icon={Dices} onClick={growAnother}>
        Grow another {plant.label.toLowerCase()}
      </Button>
    </div>
  )

  /** One stage of the chosen plant, with its own seed. */
  const renderChosen = (stage: (typeof STAGE_NUMBERS)[number]) => {
    if (chosen === "pothos") return <Pothos seed={seeds.pothos} stage={stage} scale={scale} />
    if (chosen === "peaceLily") return <PeaceLily seed={seeds.peaceLily} stage={stage} scale={scale} />
    return <Pilea seed={seeds.pilea} stage={stage} className="w-full" />
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-[var(--page-padding)] py-16">
        <header className="flex flex-col gap-4">
          <h1 className="text-h1 max-w-2xl">Plants, grown from a seed number.</h1>
          <p className="text-body text-secondary max-w-prose">
            Every plant below is drawn from code. The seed picks the pot and the
            leaves. A plant has a fixed number of stages, and each one is a
            bigger, fuller copy of the last.
          </p>
          <label className="flex max-w-sm flex-col gap-3">
            <span className="text-caption">Picture scale {Math.round(scale * 100)}%</span>
            <input
              type="range"
              min={0.4}
              max={1}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full accent-[var(--color-primary-selected)]"
            />
          </label>
        </header>

        <Section title={plant.label + ": four stages"} description={plant.description} action={growPicker}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STAGE_NUMBERS.map((n) => (
              <Card key={n} className="flex flex-col items-center gap-2 !p-4">
                <div className="flex w-full items-end justify-center">{renderChosen(n)}</div>
                <p className="text-caption">
                  {n}. {plant.stageNames[n - 1]}
                </p>
              </Card>
            ))}
          </div>
          <p className="text-body-sm text-muted">Seed {seeds[chosen]}</p>
        </Section>

        <Section
          title="Pothos: scale"
          description="The same plant at four scales. Leaf and stem positions are identical; only the picture size changes."
        >
          <Card className="flex flex-wrap items-end justify-around gap-6">
            {COMPARE_SCALES.map((sc) => (
              <div key={sc} className="flex flex-col items-center gap-2" style={{ width: 200 * sc }}>
                <Pothos seed={seeds.pothos} stage={4} className="w-full" />
                <p className="text-caption">{Math.round(sc * 100)}%</p>
              </div>
            ))}
          </Card>
        </Section>

        <Section
          title="Pothos: different plants"
          description="Eight seeds at the last stage. Pot color, band, and every leaf shape change."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {GALLERY_SEEDS.map((s) => (
              <Card key={s} className="flex flex-col items-center gap-2 !p-4">
                <Pothos seed={s} stage={4} className="w-full" />
                <p className="text-body-sm text-muted">Seed {s}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          title="Peace lily: different plants"
          description="Eight seeds at the last stage. Pot, leaf shapes, and the number and position of flowers change."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {GALLERY_SEEDS.map((s) => (
              <Card key={s} className="flex flex-col items-center gap-2 !p-4">
                <PeaceLily seed={s} stage={4} className="w-full" />
                <p className="text-body-sm text-muted">Seed {s}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          title="Pilea: same seed, five sizes"
          description="On the older engine, size still changes the leaf count."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {COMPARE_SIZES.map((sz) => (
              <Card key={sz} className="flex flex-col items-center gap-2 !p-4">
                <Pilea seed={seeds.pilea} size={sz} stage={4} className="w-full" />
                <p className="text-caption">Size {sz}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Pots" description="Five palettes. The seed picks one; any can be forced.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {POT_PALETTES.map((p, i) => (
              <Card key={p.name} className="flex flex-col items-center gap-2 !p-4">
                <Pothos seed={seeds.pothos} stage={3} pot={i} className="w-full" />
                <p className="text-caption">{p.name}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          title="Leaf generator"
          description="Ten leaves from the same generator: width, tip, lobes, lopsidedness, shade, and golden splashes vary."
        >
          <LeafLab seed={seeds.pothos} />
        </Section>
      </div>
    </main>
  )
}
