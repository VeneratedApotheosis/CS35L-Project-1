# `staged/` — the shared plant engine

This folder grows a **plant** from a single integer **seed**. The same seed
always produces the same plant, so the app stores one number (a habit's id) and
redraws the plant anywhere. Nothing here is specific to one species: a species
(pothos, snake plant, …) supplies a **config** of numbers and a **leaf shape**,
and this engine does the rest.

A plant is drawn as flat **SVG** shapes (no photos, no 3‑D). It has a fixed
number of **stages** (growth steps, default 4): stage 1 is a sprout, the last
stage is the full plant. Every stage is the full plant shrunk down and showing
fewer leaves, so growth looks even in every direction.

## Key ideas (plain terms)

- **Dome / envelope** — an invisible half‑oval standing on the soil. Every leaf
  must stay inside it. Bigger stage = bigger dome.
- **Gene** — one leaf's fixed identity (its shape, where it sprouts, how long
  its stem is, which way it leans). Decided once per seed; stages never change
  who a leaf is, only how big everything is.
- **Coverage** — how much of the dome's top the leaves fill. The engine picks a
  leaf length that looks lush without the leaves piling on top of each other.

## How it works (the pipeline)

`createStagedPlant(seed, species)` in `generate.ts` runs these steps:

1. Pick the pot and two random "spread" offsets from the seed.
2. `ladder.ts` → how many leaves and what size each stage is.
3. `genes.ts` → build each leaf's fixed identity.
4. `generate.ts` solves **one** leaf length on the full‑size plant (using
   `stemLayout.ts` to place leaves and `coverage.ts` to score them), then reuses
   that length at every stage so stages are exact scaled copies.
5. The result (pot + all stages) is cached and returned. `StemmedPlant.tsx`
   draws it.

## Files

| File | What it does |
| --- | --- |
| `types.ts` | All the TypeScript shapes. `StagedPlantConfig` is the list of **every tunable number** a species sets; `LeafShapeModel` is how a species draws one leaf; `PlacedLeaf` / `PlantStage` / `StagedPlant` describe the finished plant. No logic, just definitions. |
| `config.ts` | `validateConfig()` — sanity‑checks a species' config (e.g. the dome fits in the pot, ranges run low→high) and throws **one error listing every problem**. Runs once per config, then caches. |
| `ladder.ts` | Two small math helpers: `leafCountLadder` (how many leaves at each stage) and `scaleLadder` (the size multiplier at each stage — a geometric ramp ending at 1). |
| `dome.ts` | The envelope. `domeAtScale` sizes it for a stage, `domeValue` tells if a point is inside (≤1) or outside (>1), `canopyPoints` lays a grid of sample points under the dome's top for measuring coverage. |
| `genes.ts` | `makeGene()` — turns the seed + a leaf's index into that leaf's fixed identity (shape, root position across the pot, layer/height, lean, outward **fan**, and its outline). Each leaf has its own random stream, so adding/removing leaves never changes the others. |
| `stemLayout.ts` | `placeLeaf()` — hangs one leaf on its stem at a given stage size. If the leaf would leave the dome or dip below the soil, it shortens the stem, then the leaf, until it fits. |
| `coverage.ts` | `measureCoverage()` — of the canopy sample points, what share sit under at least one leaf (**coverage**) and how many leaves stack on average (**overlap**). |
| `generate.ts` | The orchestrator: `createStagedPlant()` builds the pot and every stage (choosing the single leaf length that hits the coverage target), caches the result, and exposes `leafOutline()` for tests/debug. |
| `StemmedPlant.tsx` | The React component that renders a plant to SVG: pot, then stems, then leaves. Optional slots let a species add parts (flowers) behind/above the leaves, and an opt‑in `planting` mode seats blades straight in the soil (hidden stems, buried bases). |
| `engine.test.ts` | Proves the engine obeys **whatever** config it is handed (builds a made‑up species with different limits), so nothing is secretly hard‑coded. |
