"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Dices } from "lucide-react"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { LeafShape } from "@/pottedPlant/plants/pothos/LeafShape"
import { Pilea } from "@/pottedPlant/plants/pilea"
import { PeaceLily } from "@/pottedPlant/plants/peaceLily"
import { Lotus } from "@/pottedPlant/plants/lotus"
import { SnakePlant } from "@/pottedPlant/plants/snakePlant"
import { KimberlyQueen } from "@/pottedPlant/plants/kimberlyQueen"
import { Lily } from "@/pottedPlant/plants/lily"
import { Rose } from "@/pottedPlant/plants/rose"
import { Monstera } from "@/pottedPlant/plants/monstera"
import { Philodendron } from "@/pottedPlant/plants/philodendron"
import { Pothos } from "@/pottedPlant/plants/pothos/Pothos"
import { randomLeafSpec } from "@/pottedPlant/plants/pothos/leaf"
import { STAGES } from "@/pottedPlant/genome"
import { POT_FINISH_IDS, POT_PALETTES, POT_SHAPE, Pot, potLookFromSeed, type PotFinishId, type PotLook } from "@/pottedPlant/pots"
import { mulberry32 } from "@/pottedPlant/rng"
import { DarkThemeSection, StageUpSection, WiltedLookSection } from "./LabSections"

const GALLERY_SEEDS = [3, 11, 24, 42, 57, 86, 101, 2025]
const COMPARE_SCALES = [0.4, 0.6, 0.8, 1]
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
      "Round, flat coin leaves on thin stalks that radiate from the base, on the same stage engine as the pothos. Baby pup plants appear beside the main one from stage 2. No flowers.",
    stageNames: ["Sprout", "Young", "Fuller", "Full cluster"],
  },
  {
    id: "lotus",
    label: "Lotus",
    description:
      "A water plant: the pot holds water with lily pads floating on it, and a few round leaves and pink flowers are held above on thin stems. Buds appear in stage 3 and open by stage 4.",
    stageNames: ["Sprout", "Pads", "Budding", "Blooming"],
  },
  {
    id: "snakePlant",
    label: "Snake plant",
    description:
      "Tall, stiff swords on the same stage engine as the pothos. Each blade has a pale-yellow margin and faint cross-banding, and stands nearly upright with little lean. No flowers.",
    stageNames: ["Sprout", "Young", "Fuller", "Full height"],
  },
  {
    id: "kimberlyQueen",
    label: "Kimberly Queen",
    description:
      "An upright crown of tall, gently arching sword fronds on the same stage engine as the snake plant. Each frond is a slim lance of many small rounded pinnae alternating up a central rachis, fresh medium-green and lighter on one side. No flowers.",
    stageNames: ["Sprout", "Young", "Fuller", "Full crown"],
  },
  // {
  //   id: "dracaena",
  //   label: "Dracaena",
  //   description:
  //     "A tall crown of long, strappy sword leaves on the same stage engine as the snake plant. Each blade arches outward and droops at the tip, deep green with a bright golden-yellow stripe up its midrib. No flowers.",
  //   stageNames: ["Sprout", "Young", "Fuller", "Full crown"],
  // },
  {
    id: "lily",
    label: "Lily",
    description:
      "Lance-shaped leaves that fan outward, with showy six-petalled stargazer flowers: white-edged pink tepals around dark-tipped stamens. Buds appear in stage 3 and open in stage 4.",
    stageNames: ["Sprout", "Young", "Budding", "Blooming"],
  },
  {
    id: "rose",
    label: "Rose",
    description:
      "A bushy plant of rounded, veined leaves with layered red blooms: rings of petals around a tight centre. Buds wrapped in green sepals appear in stage 3 and open in stage 4.",
    stageNames: ["Sprout", "Young", "Budding", "Blooming"],
  },
  {
    id: "monstera",
    label: "Monstera",
    description:
      "A few large, broad, glossy heart-shaped leaves on the same stage engine as the pothos, each cut with the signature Monstera fenestrations: rounded holes near the midrib and splits in from the edge. No flowers.",
    stageNames: ["Sprout", "Young", "Splitting", "Full leaves"],
  },
  {
    id: "philodendron",
    label: "Philodendron",
    description:
      "Broad, rounded paddle leaves in an upright crown on the same stage engine as the pothos, on thick reddish-maroon petioles. The newest, most upright leaves are deep burgundy-red; the older outer leaves are glossy green and arch outward. No flowers.",
    stageNames: ["Sprout", "Young", "Fuller", "Full crown"],
  },
] as const
type PlantId = (typeof PLANTS)[number]["id"]

const FIRST_SEED = 7
const SEED_LIMIT = 100000

/** The finish choice that leaves each pot with the finish its seed picked. */
const SEED_FINISH = "seed"
type FinishChoice = PotFinishId | typeof SEED_FINISH

/** How many consecutive seeds the finish comparison row shows. */
const FINISH_ROW_SEEDS = 12

/** A close-up of the pot: the rim and body with a little room around them. */
const POT_CLOSEUP = {
  x: POT_SHAPE.rim.x - 6,
  y: POT_SHAPE.rim.y - 6,
  width: POT_SHAPE.rim.width + 12,
  height: POT_SHAPE.shadow.cy + POT_SHAPE.shadow.ry - POT_SHAPE.rim.y + 12,
}
const POT_CLOSEUP_VIEWBOX = [POT_CLOSEUP.x, POT_CLOSEUP.y, POT_CLOSEUP.width, POT_CLOSEUP.height].join(" ")

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
    lotus: FIRST_SEED,
    snakePlant: FIRST_SEED,
    kimberlyQueen: FIRST_SEED,
    lily: FIRST_SEED,
    rose: FIRST_SEED,
    monstera: FIRST_SEED,
    philodendron: FIRST_SEED,
  })
  const [chosen, setChosen] = useState<PlantId>("pothos")
  const [scale, setScale] = useState(1)
  const [finishChoice, setFinishChoice] = useState<FinishChoice>(SEED_FINISH)
  /** The pot for a seed: its own look, with the chosen finish if one was chosen. */
  const potFor = (seed: number): PotLook => {
    const look = potLookFromSeed(seed)
    return finishChoice === SEED_FINISH ? look : { ...look, finish: finishChoice }
  }

  const plant = PLANTS.find((p) => p.id === chosen)!
  const setChosenSeed = (seed: number) =>
    setSeeds((current) => ({ ...current, [chosen]: Math.max(0, Math.floor(seed)) }))
  const growAnother = () => setChosenSeed(Math.random() * SEED_LIMIT)
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
    if (chosen === "pothos") return <Pothos seed={seeds.pothos} stage={stage} scale={scale} pot={potFor(seeds.pothos)} />
    if (chosen === "peaceLily") return <PeaceLily seed={seeds.peaceLily} stage={stage} scale={scale} pot={potFor(seeds.peaceLily)} />
    if (chosen === "lotus") return <Lotus seed={seeds.lotus} stage={stage} pot={potFor(seeds.lotus)} className="w-full" />
    if (chosen === "snakePlant") return <SnakePlant seed={seeds.snakePlant} stage={stage} scale={scale} pot={potFor(seeds.snakePlant)} />
    if (chosen === "kimberlyQueen")
      return <KimberlyQueen seed={seeds.kimberlyQueen} stage={stage} scale={scale} pot={potFor(seeds.kimberlyQueen)} />
    if (chosen === "lily") return <Lily seed={seeds.lily} stage={stage} scale={scale} pot={potFor(seeds.lily)} />
    if (chosen === "rose") return <Rose seed={seeds.rose} stage={stage} scale={scale} pot={potFor(seeds.rose)} />
    if (chosen === "monstera") return <Monstera seed={seeds.monstera} stage={stage} scale={scale} pot={potFor(seeds.monstera)} />
    if (chosen === "philodendron")
      return <Philodendron seed={seeds.philodendron} stage={stage} scale={scale} pot={potFor(seeds.philodendron)} />
    return <Pilea seed={seeds.pilea} stage={stage} scale={scale} pot={potFor(seeds.pilea)} />
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
          <label className="flex max-w-sm flex-col gap-3">
            <span className="text-caption">Pot finish</span>
            <select
              className="select"
              value={finishChoice}
              onChange={(e) => setFinishChoice(e.target.value as FinishChoice)}
            >
              <option value={SEED_FINISH}>From the seed</option>
              {POT_FINISH_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        </header>

        <WiltedLookSection />

        <StageUpSection />

        <DarkThemeSection />

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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={ChevronLeft}
              aria-label="Previous seed"
              disabled={seeds[chosen] <= 0}
              onClick={() => setChosenSeed(seeds[chosen] - 1)}
            />
            <label className="flex items-center gap-2">
              <span className="text-body-sm text-muted">Seed</span>
              <input
                type="number"
                min={0}
                step={1}
                className="input !w-32"
                value={seeds[chosen]}
                onChange={(e) => {
                  if (e.target.value !== "") setChosenSeed(Number(e.target.value))
                }}
              />
            </label>
            <Button
              size="sm"
              variant="secondary"
              icon={ChevronRight}
              aria-label="Next seed"
              onClick={() => setChosenSeed(seeds[chosen] + 1)}
            />
          </div>
        </Section>

        <Section
          title="Pot finish: consecutive seeds"
          description={
            "The pots of " +
            FINISH_ROW_SEEDS +
            " seeds in a row, starting at the seed above, with " +
            (finishChoice === SEED_FINISH ? "the finish each seed picked" : "the " + finishChoice + " finish") +
            ". Use the seed arrows to scroll through them."
          }
        >
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: FINISH_ROW_SEEDS }, (_, i) => seeds[chosen] + i).map((s) => (
              <Card key={s} className="flex flex-col items-center gap-2 !p-3">
                <svg viewBox={POT_CLOSEUP_VIEWBOX} className="w-full" role="img" aria-label={"Pot for seed " + s}>
                  <Pot look={potFor(s)} id={"finish-row-" + s} />
                </svg>
                <p className="text-caption">Seed {s}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          title="Pothos: scale"
          description="The same plant at four scales. Leaf and stem positions are identical; only the picture size changes."
        >
          <Card className="flex flex-wrap items-end justify-around gap-6">
            {COMPARE_SCALES.map((sc) => (
              <div key={sc} className="flex flex-col items-center gap-2" style={{ width: 200 * sc }}>
                <Pothos seed={seeds.pothos} stage={4} pot={potFor(seeds.pothos)} className="w-full" />
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
                <Pothos seed={s} stage={4} pot={potFor(s)} className="w-full" />
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
                <PeaceLily seed={s} stage={4} pot={potFor(s)} className="w-full" />
                <p className="text-body-sm text-muted">Seed {s}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          title="Snake plant: different plants"
          description="Eight seeds at the last stage. Pot, blade count, variegation, and cross-banding change."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {GALLERY_SEEDS.map((s) => (
              <Card key={s} className="flex flex-col items-center gap-2 !p-4">
                <SnakePlant seed={s} stage={4} className="w-full" />
                <p className="text-body-sm text-muted">Seed {s}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          title="Lily: different plants"
          description="Eight seeds at the last stage. Pot, leaf shapes, and the number and position of flowers change."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {GALLERY_SEEDS.map((s) => (
              <Card key={s} className="flex flex-col items-center gap-2 !p-4">
                <Lily seed={s} stage={4} className="w-full" />
                <p className="text-body-sm text-muted">Seed {s}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          title="Rose: different plants"
          description="Eight seeds at the last stage. Pot, leaf shapes, and the number and position of blooms change."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {GALLERY_SEEDS.map((s) => (
              <Card key={s} className="flex flex-col items-center gap-2 !p-4">
                <Rose seed={s} stage={4} className="w-full" />
                <p className="text-body-sm text-muted">Seed {s}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          title="Pilea: different plants"
          description="Eight seeds at the last stage. Pot, coin count and shapes, and the pups beside the plant change."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {GALLERY_SEEDS.map((s) => (
              <Card key={s} className="flex flex-col items-center gap-2 !p-4">
                <Pilea seed={s} stage={4} className="w-full" />
                <p className="text-body-sm text-muted">Seed {s}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Pots" description="Five palettes. The seed picks one; any pot can be put with any plant.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {POT_PALETTES.map((p, i) => (
              <Card key={p.name} className="flex flex-col items-center gap-2 !p-4">
                <Pothos seed={seeds.pothos} stage={3} pot={{ ...potFor(seeds.pothos), palette: i }} className="w-full" />
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
