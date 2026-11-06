# `pothos/` — the pothos, an example plant

The pothos is the simplest plant built on the shared engine in
[`../staged/`](../staged/README.md). Read this folder to see what a species adds
on top of that engine: **a config of numbers** and **a leaf**.

A pothos is heart‑shaped leaves on stems, in flat two‑tone green with occasional
golden splashes, drawn in the Animal Crossing icon style (flat fills, no
outlines, soft rounded shapes). Like every staged plant it is seeded (same seed
→ same plant) and grows in fixed stages.

## How it works

`createPothos(seed)` just calls the engine's `createStagedPlant(seed, POTHOS_SPECIES)`.
A **species** is two things bundled together:

- `POTHOS_CONFIG` — every number (dome size, leaf counts, stem lengths, …).
- the **heart leaf** — how to draw one leaf and, crucially, its **outline** (a
  polygon), which the engine measures to keep leaves inside the dome.

The engine places the leaves; `Pothos.tsx` renders them with `StemmedPlant`,
passing the pothos's green stem style and a function that draws one heart leaf.

The pothos has no flowers and no outward fan, so it is the plainest use of the
engine — a good template to copy for a new plant.

## Files

| File | What it does |
| --- | --- |
| `pothosConfig.ts` | `POTHOS_CONFIG`: **every number** behind the pothos (dome 56×101, up to 6 leaves, stem lengths, lean, coverage target…). It is a `StagedPlantConfig`; the engine reads it and hard‑codes nothing. |
| `leaf.ts` | The heart leaf, with no drawing: `LeafSpec` (one leaf's look), `randomLeafSpec()` (roll a leaf — shape, shade, golden splashes — from the seed), the **outline** as four Bézier curves shared by `leafPath()` (the SVG path that's drawn) and `leafPolygon()` (the point list the engine measures), and `leafColors()` / `LEAF_PALETTE` (the greens and gold). |
| `LeafShape.tsx` | The React component that **draws** one heart leaf on top of its outline: base fill, a lighter right half, golden splashes, a soft white highlight, and the midrib. Look values live in `LEAF_STYLE`. |
| `pothosStages.ts` | Glue. Bundles the config + heart leaf into `POTHOS_SPECIES`, exposes `createPothos()`, and re‑exports the plant's limits (max leaves/stages, growth ratio, bounds) that tests and the `/plants` page read, so there is one source of truth. |
| `Pothos.tsx` | The public React component `<Pothos seed=… stage=… scale=… />`. Builds the plant with `createPothos` and hands it to `StemmedPlant` with the pothos stem style and the heart‑leaf renderer. |
| `index.ts` | The folder's public exports (`Pothos`, `POTHOS_CONFIG`, `createPothos`, types). |
| `pothosStages.test.tsx` | Checks the pothos keeps every stage rule over 60 seeds: stage counts, the ≤6 leaf cap, even growth, leaves staying inside the dome and above the soil, enough coverage, and that `scale` changes only the picture size. |
