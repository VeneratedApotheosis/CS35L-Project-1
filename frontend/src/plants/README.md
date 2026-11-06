# Plants

Seeded, procedurally drawn plants in pots. The same seed always gives the same plant, so a habit stores one integer and its plant is rebuilt anywhere.

This page is a guide to the folder and a record of what was built in it. For the full algorithm and every rule, read [docs/frontend/plant-generation.md](../../../docs/frontend/plant-generation.md). To add a plant, follow the step-by-step [docs/frontend/creating-a-plant.md](../../../docs/frontend/creating-a-plant.md). A live page is at `/plants` (`src/app/plants/PlantLab.tsx`). Run the tests with `npm test` in `frontend/`.

## Folders

| Folder or file | What it is |
| --- | --- |
| `staged/` | The shared stage engine. Places leaves on stems inside a dome, one scaled copy per growth stage. Nothing here is specific to one plant |
| `pothos/` | The pothos: heart-shaped leaves |
| `peaceLily/` | The peace lily: wide pointed leaves, fanned outer leaves, and flowers that bud and bloom |
| `snakePlant/` | The snake plant: tall, upright sword blades with pale-yellow margins and cross-banding (no flowers) |
| `kimberlyQueen/` | The Kimberly Queen fern: an upright crown of tall, gently arching sword fronds, each a slim lance of small rounded pinnae alternating up a central rachis (no flowers) |
| `lily/` | The lily: lance leaves that fan, with six-petalled stargazer flowers that bud and bloom |
| `rose/` | The rose: rounded veined leaves with layered red blooms (rings of petals) that bud and bloom |
| `monstera/` | The Monstera deliciosa: a few large, broad, glossy heart leaves with fenestrations (holes near the midrib and splits cut in from the edge; no flowers) |
| `philodendron/` | The Philodendron 'Sun Red' / Rojo Congo: broad, rounded paddle leaves in an upright crown on thick reddish-maroon petioles; the newest, most upright leaves are deep burgundy-red, the older outer ones glossy green and arching (no flowers) |
| `pilea/` | The pilea (Pilea peperomioides): round, flat coin leaves on thin stalks that radiate from the base, with baby "pups" beside the main plant (no flowers) |
| `lotus/` | The lotus: a water plant with lily pads floating on the pot's water, and round leaves and pink flowers held above on thin stems |
| `pot/` | The pot, separate from the plants: palettes, shape, the pot's look (`potLookFromSeed`) and the finish registry |
| `PottedPlant.tsx` | The picture of a potted plant: the shared canvas, the pot, then a plant drawn on top |
| `genome.ts`, `geometry.ts`, `rng.ts` | Shared helpers: canvas and soil point, geometry, seeded random numbers |

## How to change a plant

Every number is in a named config, never in the engine. The usual places:

| To change | Edit |
| --- | --- |
| How many leaves a plant has | `stages.maxLeaves` in `pothos/pothosConfig.ts` or `peaceLily/peaceLilyConfig.ts` |
| Leaf length, stems, how dense the foliage is | `leaves`, `stems`, `coverage` in the same configs |
| How far the outer leaves fan | `fan` in `peaceLilyConfig.ts`, and `LILY_LEAF_FAN.sweep` in `peaceLily/leaf.ts` |
| Peace lily flowers: count, size, height, spread, when they bud and bloom | `FLOWER_CONFIG` in `peaceLilyConfig.ts` |
| Peace lily flower look | `FLOWER_STYLE` in `peaceLily/Flower.tsx` |
| Pot colors | `POT_PALETTES` in `pot/palettes.ts` |
| How likely a pot is to have the stripe | `POT_BAND_ODDS` in `pot/palettes.ts` |
| Pot shape and stripe | `POT_SHAPE` in `pot/shape.ts` |
| How likely each pot finish is | `POT_FINISH_WEIGHTS` in `pot/style.ts` |
| Add a pot finish | One file in `pot/finishes/`, one entry in `pot/finishes/index.ts`, one weight in `POT_FINISH_WEIGHTS` |

A config is checked by `validateConfig` when a plant is built, and it lists everything that does not fit together.

## What was added

### Peace lily (`peaceLily/`)

- Built on the stage engine, so it follows the same rules as the pothos: four stages, scaled copies, containment, and `scale` never moves anything.
- Leaves are wide pointed blades (`shape.ts`, `leaf.ts`, `LilyLeafShape.tsx`), up to 8 per plant (2, 4, 6, 8 over four stages).
- **Outer leaves fan outward.** Leaves rooted toward the outside bend away from the middle and show their inner face, with the lighter half on the side toward the middle. Other leaves are untouched. The engine supports this through an optional `fan` section in the config, so plants without it, such as the pothos, are not affected.
- **Flowers** (`flowers.ts`, `Flower.tsx`): 1 to 3 per plant, each a stalk with a white hood and a cream spike.
  - None in stages 1 and 2, a closed bud in stage 3, an open bloom in stage 4.
  - The top of each flower stands between 60% and 120% of the plant's maximum height.
  - Every flower head sits within 30 degrees of straight up from the middle of the pot.
  - Flowers grow with the plant: they are placed once at full size and scaled with each stage.
- It replaced an older, unused peace lily (`PeaceLily.tsx` and `lily.ts`), which was removed.

### Pilea (`pilea/`)

- Ported from the older continuous-growth engine onto the stage engine, like the pothos and snake plant: four stages, scaled copies, containment, a leaf cap, and `scale` never moves anything.
- Leaves are round, flat **coins** held face-on (`pileaLeaf.ts`, `PileaLeafShape.tsx`): a near-circular blade with a lighter right half, fine veins radiating from a central dimple, and one soft white highlight. Up to 6 coins per plant (2, 3, 5, 6 over four stages) on thin stalks that radiate from the base.
- **Pups** (`pileaPups` in `pileaStages.ts`): 1 to 2 baby clusters of small coins beside the main plant. They appear from stage 2 and scale with each stage, drawn through the engine's `renderBehindLeaves` slot, from their own seed streams so they never move the main coins.
- It replaced the older `Pilea.tsx` and `pileaGenome.ts`, which were removed along with the now-unused continuous-growth helpers (`SIZE_MIN`, `SIZE_MAX`, `VinePoint`, `pointAt`) in `genome.ts`.

### Dracaena 'Golden Heart' (`dracaena/`)

- Built on the stage engine like the snake plant, so it follows the same rules: four stages, scaled copies, containment, and `scale` never moves anything.
- Leaves are long, strappy swords (`dracaenaLeaf.ts`, `DracaenaLeafShape.tsx`), up to 6 per plant, that radiate from a central base.
- **Every leaf arches outward.** It uses the engine's `fan` section with `outerThreshold` 0, so all leaves bend away from the middle and droop at the tips, showing their inner (lighter) face.
- Each blade is deep green with a tapering golden-yellow stripe drawn up its midrib (the "golden heart"), plus the lighter half and one soft white highlight. No flowers.

### The engine (`staged/`)

- `StemmedPlant` draws the plant only, with no pot and no `svg`. It has two optional drawing slots, `renderBehindLeaves` and `renderAboveLeaves`, so a plant can add its own parts. The peace lily uses them for flower stalks and heads.
- The config has an optional `fan` section, and each placed leaf carries a `fan` value from -1 to 1. A species can use it to bend its outer leaves.
- The leaf outline function takes an optional `fan` argument. The pothos ignores it.

### Pots (`pot/`)

- The pot was split from the plants. A plant draws only its stems, leaves and flowers. A pot has its own look, `PotLook` (palette, band, finish and a pattern seed), chosen by `potLookFromSeed(seed)` from a random stream made from the seed alone. Existing seeds gave a different plant and pot once when this changed.
- `PottedPlant` puts a pot and a plant together. Each plant has a bare drawing (such as `PothosDrawing` and `LotusDrawing`) and a composed component (`Pothos`, `PeaceLily`, `SnakePlant`, and the rest) that takes an optional `pot` look and defaults to the one its seed gives. Any pot can go with any plant.
- A **finish** is a way to fill the pot body, registered in `pot/finishes/index.ts`. The first is `solid`: the body color with the stripe if the look has one. To add one, write a file in `pot/finishes/`, add it to the registry, and add its weight to `POT_FINISH_WEIGHTS` in `pot/style.ts`.
- The dotted band is gone. A pot has either no band or the stripe, chosen by weighted odds (`POT_BAND_ODDS`, none 1 part and stripe 2).

### The `/plants` page

- One four-stages section with a plant picker (pothos, peace lily, pilea, snake plant, Kimberly Queen, lily, rose, monstera, philodendron and lotus) and a Grow another button that regrows the chosen plant. Each plant keeps its own seed, and arrows and a number box step through seeds.
- A pot finish picker that overrides the finish of every pot on the page, and a row of consecutive seeds' pots to compare.
- Galleries of eight seeds for the snake plant, lily, rose and pilea at the last stage.
- Galleries of eight seeds for the pothos and the peace lily.

## Tests

| File | Checks |
| --- | --- |
| `pothos/pothosStages.test.tsx` | The stage rules for the pothos, over 60 seeds |
| `staged/engine.test.ts` | The engine follows whatever config it is given |
| `peaceLily/peaceLily.test.tsx` | Flower stages, flower height and spread, the leaf cap, the outer-leaf fan, and scale |
| `snakePlant/snakePlant.test.tsx` | The stage rules for the snake plant: stage counts, containment, roots, buried bases, scaling, and scale-invariance |
| `kimberlyQueen/kimberlyQueen.test.tsx` | The stage rules for the Kimberly Queen fern: stage counts, containment, coverage, roots, frond identity, scaling, and scale-invariance |
| `lily/lily.test.tsx` | Flower stages, the leaf cap and fan, and the stage rules for the lily |
| `rose/rose.test.tsx` | Flower stages, the leaf cap, and the stage rules for the rose |
| `monstera/monstera.test.tsx` | The stage rules for the monstera: stage counts, containment, coverage, roots, leaf identity, scaling, and scale-invariance |
| `pilea/pilea.test.tsx` | The stage rules for the pilea: stage counts, containment, coverage, roots, leaf identity, scaling, scale-invariance, and that pups appear from stage 2 |
| `philodendron/philodendron.test.tsx` | The stage rules for the philodendron: stage counts, containment, coverage, roots, leaf identity, scaling, scale-invariance, red stems, and that the newest upright leaves are burgundy |
| `pot/pot.test.tsx` | Pot geometry, `potLookFromSeed`, palettes, bands (including that no dots are drawn), and the band odds |
| `pot/finishes/finishes.test.tsx` | The finish registry, its weights, the weighted pick and the solid finish |
| `pot/finishes/addingAFinish.test.tsx` | A finish that exists only in the test is drawn inside the pot's clip |
| `PottedPlant.test.tsx` | The split: plants carry no pot, the pot is drawn before the plant, any pot with any plant, and scale |

## Known gaps

- The backend counts five growth stages, but the plants default to four.
- No plant has a wilted look yet.
- Flower settings are not covered by `validateConfig`, only by the tests.
