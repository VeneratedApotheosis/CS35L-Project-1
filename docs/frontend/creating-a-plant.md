# Creating a new plant — step by step

A precise runbook for adding a new plant on the shared **stage engine**. Follow
it top to bottom. For the ideas behind the engine read
[`frontend/src/pottedPlant/plants/staged/README.md`](../../frontend/src/pottedPlant/plants/staged/README.md);
for a worked example read
[`frontend/src/pottedPlant/plants/pothos/README.md`](../../frontend/src/pottedPlant/plants/pothos/README.md).
For the rules every plant must keep, see
[plant-generation.md](plant-generation.md).

All paths below are under `frontend/`. A path with no `src/` prefix, such as
`pothos/leaf.ts` or `staged/types.ts`, is relative to `src/pottedPlant/plants/`. Replace `Foo` / `foo` with your plant's
name (PascalCase for components, camelCase for ids and files). This guide builds
a **leaf-only** plant (no flowers); the optional extras — outward fan, flowers,
planted-in-soil — are at the end.

---

## What you will create

A new folder `src/pottedPlant/plants/foo/` with six files, plus edits to three shared files:

```
src/pottedPlant/plants/foo/
  fooLeaf.ts          the leaf: random look + outline polygon + colors
  FooLeafShape.tsx    draws one leaf (flat fills)
  fooConfig.ts        every tunable number (a StagedPlantConfig)
  fooStages.ts        bundles config + leaf into a species; exports createFoo
  Foo.tsx             the React component
  index.ts            public exports
  foo.test.tsx        the stage-rule tests
```

Shared files to edit: `src/app/plants/PlantLab.tsx`, `src/pottedPlant/README.md`,
`docs/frontend/plant-generation.md`.

---

## The one rule that matters most

The engine measures the polygon your leaf's `outline()` returns to keep every
leaf inside the dome and above the soil. **`outline()` must return the exact
silhouette you draw** — same length, same curves — with the stalk end at
`(0,0)` and the tip at `(0,-length)`. If the drawing and the outline disagree,
leaves spill out of the pot or float. Share the curve maths between the SVG path
and the polygon (as `fooLeaf.ts` does below).

---

## Step 1 — The leaf model (`fooLeaf.ts`)

Defines one leaf's look (independent of where it sits), its outline, and its
colors. Two ways to build the outline:

- **Reuse the shared blade.** For pointed / strap / oval leaves, import
  `bladePath` + `bladeOutline` from `../peaceLily/shape` and just pick a
  `BladeShape` (see the snake plant and lily).
- **Write your own Béziers.** For a distinct silhouette (the pothos heart),
  write a `leafSegments()` and feed it to both a path builder and a polygon
  sampler (copy `pothos/leaf.ts`).

```ts
import { range, type Range, type Rng } from "../../rng"

/** One leaf's look, independent of where it sits. Keep every number named. */
export interface FooLeafSpec {
  aspect: number   // width / length
  shade: number    // 0 dark .. 1 bright
  // add your own shape fields
}

export const FOO_LEAF_RANGES = {
  aspect: [0.5, 0.7] as Range,
  // ...ranges for every random field
}

/** Draw one leaf's look from the seed. The order of draws is part of identity. */
export function randomFooLeaf(rng: Rng, r = FOO_LEAF_RANGES): FooLeafSpec {
  return { aspect: range(rng, ...r.aspect), shade: rng() }
}

/** The SVG path: stalk end at (0,0), tip at (0,-length). */
export function fooLeafPath(spec: FooLeafSpec, length: number): string { /* ... */ return "" }

/** The SAME outline as a closed polygon, `perSegment` points per curve. */
export function fooLeafPolygon(spec: FooLeafSpec, length: number, perSegment: number): [number, number][] { /* ... */ return [] }

/** Flat fills in HSL: a base and a lighter half, derived from `shade`. */
export function fooLeafColors(spec: FooLeafSpec) { /* ... */ return { base: "", light: "" } }
```

## Step 2 — The leaf drawing (`FooLeafShape.tsx`)

Flat fills only, Animal-Crossing style: base fill, a lighter half (clipped to
the leaf), **one** soft low-opacity white highlight, and a midrib. No strokes as
outlines. Put every size/opacity in a named `FOO_LEAF_STYLE` object. `clipId`
must be unique (the engine passes a unique one per leaf).

```tsx
import { fooLeafColors, fooLeafPath, type FooLeafSpec } from "./fooLeaf"

export const FOO_LEAF_STYLE = { lightHalf: { opacity: 0.5 }, highlight: { /* ... */ } }

export function FooLeafShape({ spec, length, clipId }: { spec: FooLeafSpec; length: number; clipId: string }) {
  const d = fooLeafPath(spec, length)
  const c = fooLeafColors(spec)
  return (
    <g>
      <clipPath id={clipId}><path d={d} /></clipPath>
      <path d={d} fill={c.base} />
      <g clipPath={`url(#${clipId})`}>{/* lighter half + highlight */}</g>
      {/* midrib */}
    </g>
  )
}
```

## Step 3 — The config (`fooConfig.ts`)

A `StagedPlantConfig`. **Copy `pothos/pothosConfig.ts`** and change numbers; the
engine hard-codes nothing. Every field is documented on `StagedPlantConfig` in
`staged/types.ts`. Keep these invariants (checked by `validateConfig`, which
runs when the plant is first built and throws listing every problem):

- `dome` must fit between `limits.left/right`; `dome.anchor` sits on
  `limits.floor` (the soil). Keep `SIDE_OVERHANG` at 8.
- `anchor` is the shared `SOIL` point; `limits` and `pot.rim*` come from
  `POT_RIM`, so the plant tracks the shared pot.
- Give `rngStreams.leaf` a number **no other plant uses** (grep existing configs)
  so two plants never share random draws.

Fields you will most likely tune: `stages.maxLeaves` (leaf cap), `dome`
(how tall/wide), `leaves.lengthRange`, `stems`, and `coverage.target` (how lush).

```ts
import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

const SIDE_OVERHANG = 8
export const FOO_CONFIG: StagedPlantConfig = {
  name: "foo",
  stages: { default: 4, max: 9, minLeaves: 2, maxLeaves: 6, leafCountCurve: 1.15, growthRatio: 3.6 },
  dome: { anchor: { x: SOIL.x, y: SOIL.y }, halfWidth: 56, height: 100 },
  limits: { left: POT_RIM.left - SIDE_OVERHANG, right: POT_RIM.right + SIDE_OVERHANG, floor: SOIL.y },
  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },
  roots: { range: [0.25, 0.75], middle: 0.5, spreadStep: 0.618 },
  layers: { bands: [{ start: 0, width: 0.4 }, { start: 0.6, width: 0.4 }], spreadStep: 0.7549 },
  stems: { lengthRange: [0.16, 0.62], minLength: 0.12, reachMultiplier: 1.5, headroomShare: 0.9, leafHeadroomShare: 0.9, headingSpread: 34, headingJitter: [-8, 8], bendPoint: 0.62, shrinkFloor: 0.55, shrinkStep: 0.94 },
  leaves: { lengthRange: [0.16, 0.55], lengthFactor: [0.92, 1.08], curl: [10, 28], jitter: [-6, 6], drawOrderNoise: 0.05, shrinkStep: 0.9 },
  coverage: { target: 0.6, canopyFloor: 0.2, gridX: 22, gridY: 16, maxOverlap: 1.6 },
  search: { lengthSteps: 14, fitSegments: 8, measureSegments: 6, fitAttempts: 40, stemSteps: 40 },
  rngStreams: { leaf: 199 }, // must be unique across plants
}
```

## Step 4 — The species (`fooStages.ts`)

Bundle the config and a `LeafShapeModel` into a species, and expose `createFoo`.
`middle` is where the leaf's centre sits along its length (used for draw order);
`outline` must forward `fan` (pass it through even if you don't fan yet).

```ts
import { fooLeafPolygon, randomFooLeaf, type FooLeafSpec } from "./fooLeaf"
import { FOO_CONFIG } from "./fooConfig"
import { createStagedPlant, leafOutline as stagedLeafOutline } from "../staged/generate"
import { leafCountLadder, scaleLadder } from "../staged/ladder"
import type { LeafShapeModel, PlacedLeaf as StagedPlacedLeaf, PlantStage, StagedPlant, StagedPlantOptions, StagedPlantSpecies } from "../staged/types"

const FOO_LEAF: LeafShapeModel<FooLeafSpec> = {
  randomSpec: randomFooLeaf,
  outline: (spec, length, perSegment, fan) => fooLeafPolygon(spec, length, perSegment /*, fan */),
  middle: 0.45,
}
export const FOO_SPECIES: StagedPlantSpecies<FooLeafSpec> = { config: FOO_CONFIG, leaf: FOO_LEAF }

export type PlacedLeaf = StagedPlacedLeaf<FooLeafSpec>
export type FooPlant = StagedPlant<FooLeafSpec>
export const createFoo = (seed: number, options: StagedPlantOptions = {}) => createStagedPlant(seed, FOO_SPECIES, options)
export const leafOutline = (leaf: PlacedLeaf, perSegment?: number) => stagedLeafOutline(leaf, FOO_SPECIES, perSegment)
export const stageLeafCounts = (stages: number) => leafCountLadder(stages, FOO_CONFIG.stages)
export const stageScales = (stages: number) => scaleLadder(stages, FOO_CONFIG.stages)
```

## Step 5 — The component (`Foo.tsx`)

Wire `createFoo` into `StemmedPlant`. Give it a stem color/width, and a
`renderLeaf` that draws one leaf. Props are seed / stage / stages / scale / pot.

```tsx
"use client"
import { useMemo } from "react"
import { FooLeafShape } from "./FooLeafShape"
import { FOO_CONFIG } from "./fooConfig"
import { createFoo, type PlacedLeaf } from "./fooStages"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"

const FOO_STEM: StemStyle = { color: "hsl(104 40% 40%)", width: 2.6 }

export function Foo({ seed, stages = FOO_CONFIG.stages.default, stage = stages, scale, pot, className, title = "Foo plant in a pot" }: {
  seed: number; stage?: number; stages?: number; scale?: number; pot?: number; className?: string; title?: string
}) {
  const plant = useMemo(() => createFoo(seed, { stages }), [seed, stages])
  return (
    <StemmedPlant plant={plant} stage={stage} scale={scale} pot={pot} stemStyle={FOO_STEM}
      renderLeaf={(leaf: PlacedLeaf, clipId) => <FooLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />}
      className={className} title={title} />
  )
}
```

## Step 6 — Exports (`index.ts`)

```ts
export { Foo } from "./Foo"
export { FOO_CONFIG } from "./fooConfig"
export { createFoo, type FooPlant } from "./fooStages"
```

## Step 7 — Register in the lab (`src/app/plants/PlantLab.tsx`)

Four edits (the TypeScript `PlantId` union is derived from the `PLANTS` array,
so all four must agree or the file won't compile):

1. **Import:** `import { Foo } from "@/pottedPlant/plants/foo"`
2. **`PLANTS` array** — add an entry:
   ```ts
   { id: "foo", label: "Foo", description: "One sentence on what's distinctive.", stageNames: ["Sprout", "Young", "Fuller", "Full"] },
   ```
3. **`seeds` state** — add the key so the `Record<PlantId, number>` is complete:
   `foo: FIRST_SEED,`
4. **`renderChosen`** — add a branch:
   `if (chosen === "foo") return <Foo seed={seeds.foo} stage={stage} scale={scale} />`

Open `/plants`, pick your plant, and click **Grow another** to eyeball many
seeds at every stage, in light and dark mode.

## Step 8 — The tests (`foo.test.tsx`)

Copy `snakePlant/snakePlant.test.tsx` (leaf-only) and rename the imports to your
`createFoo` / `leafOutline` / `stageLeafCounts` / `stageScales`. It runs ~60
seeds and checks: deterministic output, stage counts and the leaf cap, the last
stage ≥ 3.6× the first, even growth, every leaf a scaled copy of the full-size
leaf, every outline above the soil and within the side limits, coverage/overlap,
and that `scale` changes only the picture size.

## Step 9 — Docs

Add a one-line row for the plant to the tables in `src/pottedPlant/README.md` and
`docs/frontend/plant-generation.md`.

## Step 10 — Verify

From `frontend/`:

```bash
npx tsc --noEmit
npm run lint
npm test
```

All three must pass. `validateConfig` runs inside the tests (via `createFoo`),
so a bad config fails here with a list of exactly what doesn't fit.

---

## Optional extras

- **Fan the outer leaves outward** (like the peace lily, lily, monstera,
  philodendron). Add an opt-in `fan` block to the config
  (`{ outerThreshold, strength: Range, turn: Range }`) and make your `outline()`
  bend the blade by the `fan` argument (−1..1) so the bend is part of the fitted
  and measured shape. The engine (`staged/genes.ts`) drives it only when `fan`
  is present; plants without it are unchanged. Copy `lily/leaf.ts`.
- **Flowers or other parts.** `StemmedPlant` has two slots, `renderBehindLeaves`
  (between stems and leaves) and `renderAboveLeaves` (on top). Reuse the peace
  lily's flower placement in `peaceLily/flowers.ts`. See the lily and rose.
- **Planted straight in the soil** (no visible stems, buried bases — like the
  snake plant). Pass `planting={{ bury, soilY: SOIL.y }}` to `StemmedPlant` and
  collapse `stems.lengthRange` to ~0 in the config. The stems are hidden and the
  bottom `bury` share of each leaf is clipped below the soil line. Opt-in, so
  other plants are unaffected.
