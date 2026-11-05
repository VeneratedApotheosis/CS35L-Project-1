# Plants

Seeded, procedurally drawn plants in pots. The same seed always gives the same plant, so a habit stores one integer and its plant is rebuilt anywhere.

This page is a guide to the folder and a record of what was built in it. For the full algorithm and every rule, read [docs/frontend/plant-generation.md](../../../docs/frontend/plant-generation.md). A live page is at `/plants` (`src/app/plants/PlantLab.tsx`). Run the tests with `npm test` in `frontend/`.

## Folders

| Folder or file | What it is |
| --- | --- |
| `staged/` | The shared stage engine. Places leaves on stems inside a dome, one scaled copy per growth stage. Nothing here is specific to one plant |
| `pothos/` | The pothos: heart-shaped leaves |
| `peaceLily/` | The peace lily: wide pointed leaves, fanned outer leaves, and flowers that bud and bloom |
| `pot/` | The pot every plant sits in: palettes, shape, and the band (none or a stripe) |
| `Pilea.tsx`, `pileaGenome.ts` | The pilea, still on the older continuous-growth engine |
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

### The engine (`staged/`)

- `StemmedPlant` has two optional drawing slots, `renderBehindLeaves` and `renderAboveLeaves`, so a plant can add its own parts. The peace lily uses them for flower stalks and heads.
- The config has an optional `fan` section, and each placed leaf carries a `fan` value from -1 to 1. A species can use it to bend its outer leaves.
- The leaf outline function takes an optional `fan` argument. The pothos ignores it.

### Pots (`pot/`)

- The dotted band is gone. A pot now has either no band or the stripe.
- Existing seeds keep their pot: a pot that was plain is still plain, and one that had a stripe or dots now shows the stripe. This is done by a weighted choice (`POT_BAND_ODDS`, none 1 part and stripe 2) using the same single random draw as before.
- The pilea picks its band the same way, through `pickPotBand`.

### The `/plants` page

- One four-stages section with a plant picker (pothos, peace lily, pilea) and a Grow another button that regrows the chosen plant. Each plant keeps its own seed.
- Galleries of eight seeds for the pothos and the peace lily.

## Tests

| File | Checks |
| --- | --- |
| `pothos/pothosStages.test.tsx` | The stage rules for the pothos, over 60 seeds |
| `staged/engine.test.ts` | The engine follows whatever config it is given |
| `peaceLily/peaceLily.test.tsx` | Flower stages, flower height and spread, the leaf cap, the outer-leaf fan, and scale |
| `pot/pot.test.tsx` | Pot geometry, palettes, bands (including that no dots are drawn), and the band odds |

## Known gaps

- The pilea is on the older engine and does not follow the stage rules yet.
- The backend counts five growth stages, but the plants default to four.
- No plant has a wilted look yet.
- Flower settings are not covered by `validateConfig`, only by the tests.
