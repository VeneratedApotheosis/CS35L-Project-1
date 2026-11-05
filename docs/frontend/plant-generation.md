# Plant generation

Plants are drawn as SVG from a **seed**. The same seed always gives the same plant, so a habit can store one integer (e.g. its id) and the plant is rebuilt on every screen.

Code lives in `frontend/src/plants/`. A live prototype is at `/plants`. Run the tests with `npm test` in `frontend/`. For how plants fit into the screens, see [design.md](design.md#6-illustration-plants-and-pots).

Status:

| Plant | Engine | State |
| --- | --- | --- |
| Pothos | Stage engine | Current |
| Peace lily | Stage engine, plus its own flowers | Current |
| Snake plant | Stage engine (leaf-only) | Current |
| Kimberly Queen fern | Stage engine (leaf-only, arching feathery fronds) | Current |
| Dracaena 'Golden Heart' | Stage engine (leaf-only, arching leaves) | Current |
| Lily | Stage engine, reuses the peace lily's flower engine | Current |
| Rose | Stage engine, reuses the peace lily's flower engine | Current |
| Monstera deliciosa | Stage engine (leaf-only, fenestrated leaves) | Current |
| Pilea peperomioides | Stage engine (leaf-only, round coins, with pups) | Current |
| Philodendron 'Sun Red' / Rojo Congo | Stage engine (leaf-only, broad paddles, red stems, burgundy newest leaves) | Current |

---

## Contents

- [Code map](#code-map)
- [Design rules](#design-rules)
- [1. Style](#1-style-animal-crossing-new-horizons-icons)
- [2. Pot](#2-pot)
- [3. Stage engine](#3-stage-engine)
- [4. Pothos](#4-pothos)
- [5. Peace lily](#5-peace-lily)
- [6. Pilea peperomioides](#6-pilea-peperomioides)
- [7. Tests](#7-tests)
- [8. Open items](#8-open-items)
- [9. History](#9-history)

---

## Code map

The stage engine is shared. A plant is the engine plus a config and a leaf shape.

```
plants/
  staged/                  the engine: nothing in here is specific to one plant
    types.ts               StagedPlantConfig (every tunable number), LeafShapeModel, results
    config.ts              validateConfig: checks a config's assumptions, lists every problem
    ladder.ts              leaves per stage and envelope scale per stage
    dome.ts                the envelope (a half-ellipse) and the canopy sample points
    genes.ts               the per-seed facts about each leaf, shared by every stage
    stemLayout.ts          hangs one leaf from its stem and fits it inside the dome
    coverage.ts            how well leaves fill the canopy, and how deeply they stack
    generate.ts            createStagedPlant: builds every stage of a plant for a seed
    StemmedPlant.tsx       draws a staged plant; the species supplies the leaf drawing
  pothos/
    pothosConfig.ts          every number behind the pothos
    pothosStages.ts          the pothos species: config + heart leaf, and the names tests use
    Pothos.tsx               the pothos component: stem look + heart leaf drawing
    leaf.ts / LeafShape.tsx  the heart leaf: random ranges, outline, palette, drawing style
  peaceLily/
    peaceLilyConfig.ts       every number behind the peace lily: leaves, flowers, hood shapes
    peaceLilyStages.ts       the species: config + pointed leaf, plus createPeaceLily
    PeaceLily.tsx            the component: stems, leaves, flower stalks and heads
    leaf.ts / LilyLeafShape.tsx  the pointed leaf: ranges, outline, palette, drawing style
    shape.ts                 the pointed blade outline shared by leaf and flower hood
    flowers.ts               flower placement, the flower dome and the bud/bloom stages
    Flower.tsx               draws flower stalks, buds and open flowers
  geometry.ts, rng.ts      small shared helpers
  pot/                     the pot, shared by every plant
    palettes.ts            the color palettes and the band names
    shape.ts               every measurement of the drawing, plus the rim and soil points
    style.ts               pickPotStyle: choose a palette and band from a seed
    Pot.tsx                the pot component
    index.ts               one place to import all of the above from
```

### Adding a plant that grows on stems

1. Write a **config** (copy `pothos/pothosConfig.ts` and change numbers). `validateConfig` runs automatically and says what does not fit together.
2. Write a **leaf shape model**: how to draw a random leaf, its outline as a polygon, and where its middle is. The engine only needs the outline to measure coverage and containment.
3. Combine them into a species and call `createStagedPlant(seed, species)`.
4. Draw it with `StemmedPlant`, passing a function that draws one leaf and a stem style. To add parts of your own (the peace lily's flowers), pass `renderBehindLeaves` and `renderAboveLeaves`.

No number is hard-coded in the engine. `staged/engine.test.ts` builds a second plant with different limits to show it follows its own config.

---

## Design rules

These are the decisions we made for every stage-engine plant. Each is enforced by the engine, and by a test.

| Rule | How it is kept |
| --- | --- |
| **Seeded.** The same integer always gives the same plant | Every random draw comes from the seed. A leaf has its own sub-seed, so leaf identity never changes between stages |
| **Fixed stages, none in between.** A plant is a seed plus a stage number, 1 to S (default 4) | There is no growth value. `createPothos(seed, { stages })` returns S layouts |
| **The last stage is at least 3.6 times the first** | The envelope scales on a geometric ladder with `growthRatio` 3.6 |
| **Growth is even in every direction** | Every stage is the same dome scaled about the soil point |
| **A leaf cap per stage** | `stages.maxLeaves`: 6 for the pothos (2, 3, 5, 6 over four stages) and 8 for the peace lily (2, 4, 6, 8) |
| **Leaves, stems and roots scale with the plant** | The leaf length is solved once at full size, so each stage is the full plant scaled about the soil point, showing its first n leaves |
| **No leaf goes under the pot or far to either side** | Every leaf outline is fitted inside the dome, above the soil line, with at most 8 px of overhang past the rim |
| **`scale` resizes the picture and moves nothing** | It is a CSS width on the SVG and never enters the generator |
| **Stems start at different spots across the middle half of the pot** | Roots are spread between 25% and 75% of the rim width |
| **Stems have different lengths, in layers** | Each leaf has a layer from 0 to 1, which sets its stem length |
| **No hidden assumptions** | Every number is in a named config, and `validateConfig` checks they fit together |
| **The pot never changes** | Pot geometry is in `pot/shape.ts`, 46 tall, and does not scale with the plant |

---

## 1. Style: Animal Crossing: New Horizons icons

| Trait | How we draw it |
| --- | --- |
| No outlines | Flat fills. Edges come from a lighter or darker second tone, never a stroke. |
| Two-tone shading | Each leaf has a lighter half (right of the midrib) over the base green. A flower hood has a shaded left half. |
| Soft highlight | One small, low-opacity white oval per leaf and per pot. |
| Round, chunky forms | Wide hearts, blunt lobes, thick pot lip, broad pointed lily leaves. |
| Friendly palette | Saturated but gentle: pothos green `hsl(118 46% 42%)`, golden splashes `hsl(52 78% 72%)`, lily green around `hsl(140 38% 28%)`, flower white `#fcfaf1`, terracotta `#e08a5c`. |
| Grounded | A soft oval shadow under the pot. |

## 2. Pot

Code: `frontend/src/plants/pot/`. A low drum pot (body 46 tall) built from a rounded **rim**, a tapered **body**, a dark **soil** oval, and a **shadow** oval. The seed picks a palette (terracotta, cream, sage, sky, blush) and a band (none, or a stripe; the stripe is twice as likely, see `POT_BAND_ODDS`). There used to be a dotted band too; pots that would have had it now get the stripe. The pot never changes size with the plant.

Every measurement is a named value in `pot/shape.ts` (`POT_SHAPE`). Two of them are used by the plants: `POT_RIM` (where stems are placed across the pot) and `POT_SOIL` (where plants meet the pot, which becomes the shared `SOIL` point). Neither number is repeated anywhere else, so changing the pot's shape moves the plants with it.

The canvas is `0 0 200 235`, and the soil point is `(100, 148)`.

## 3. Stage engine

Code: `frontend/src/plants/staged/`. Everything in this section is shared by every stage-engine plant. The numbers quoted are the **pothos's**; the peace lily changes some of them (section 5).

### 3.1 The envelope

Every stage places its leaves inside an **envelope**: a half-ellipse dome standing on the soil point.

- The dome is defined at its largest, for the last stage. Stage k is the same dome **scaled about the soil point**, so the plant grows evenly in every direction. Leaves, stems and roots scale with it (see 3.3).
- The dome must fit inside the **limits**: the rim plus 8 px on each side, and the soil line as the floor. `validateConfig` checks this. No leaf can spill under the pot or far to either side, at any stage.
- Scales form a geometric ladder ending at 1, with a last:first ratio of `growthRatio` (3.6). For four stages: 0.28, 0.43, 0.65, 1.

### 3.2 Leaves per stage

At most `maxLeaves` (the pothos has 6, the peace lily 8). Four stages give **2, 3, 5, 6** leaves for the pothos and **2, 4, 6, 8** for the peace lily. Both the number of leaves and the dome grow at every step, and leaves are longer at every step, so each stage visibly changes. The ramp is `leafCountCurve`: 1 is a straight line, above 1 adds leaves late.

### 3.3 Placement: roots, stems and layers

Every leaf hangs from its own stem, and no two leaves share the same root or the same height.

1. **Genes (per seed, shared by all stages).** Leaf `i` has its own sub-seed, so its shape, length factor, jitter and curl never change between stages.
2. **Root.** Each stem starts at its own spot across the pot, between **25% and 75%** of the way from the left rim to the right rim (so x 76 to 124 at the last stage). A golden-ratio sequence spreads the roots, so any run of leaves is spread across the pot. Roots scale in toward the center at smaller stages, like everything else.
3. **Heading.** Stems on the left lean left and stems on the right lean right (up to `headingSpread` degrees), so the plant fans outward a little. The leaf turns a further `curl` degrees outward at the end of its stem.
4. **Layer.** Each leaf has a layer from 0 (nearest the soil) to 1 (highest). Even-numbered leaves take the low band (0 to 0.4) and odd-numbered leaves take the high band (0.6 to 1), so even two leaves sit at clearly different distances from the origin. The layer sets the stem length, from `stems.lengthRange[0]` of the dome height up to however far the leaf still fits under the top of the dome, so layers keep their spacing at every stage and leaf size. Lower layers are drawn on top.
5. **Fitting (hard guarantee).** The real leaf outline, sampled from the same curves that are drawn, must sit inside the dome and above the soil line. If it does not, the stem is shortened a little (down to 55% of its layer length), and if that is not enough the leaf is shortened by 10% and tried again.
6. **Leaf length.** The solver runs **once, on the full-size plant**. It tries `search.lengthSteps` (14) lengths across `leaves.lengthRange` (a share of the dome height) and keeps the smallest one that covers `coverage.target` (60%) of the canopy without stacking too deep. That length, as a share of the dome height, is then used at **every** stage. Leaves therefore grow exactly as fast as the dome: leaf length, stem length, root position and leaf direction at any stage are the full-size values scaled about the soil point. A stage differs from the last only in its scale and in how many leaves it shows (the first n).

This is tested: every leaf a stage shares with the last stage must be that leaf scaled by the stage's scale.

### 3.4 Coverage and overlap

Coverage is the share of sample points in the canopy (the dome above `canopyFloor`, 20% of its height) that lie inside some leaf. The solver aims for 0.6 at the full-size stage using the smallest leaves that get there. Earlier stages show fewer leaves at the same proportions, so they cover less: for the pothos, over seeds 1 to 60, it averages about 0.28, 0.39, 0.53 and 0.59 for stages 1 to 4. It also measures **overlap**: the average number of leaves stacked at a covered point, kept at or below `maxOverlap` (1.6). Tests enforce coverage of at least 0.15 and overlap of at most 1.75.

### 3.5 Stems

Every leaf hangs from a visible stem, 2.6 units wide, that rises along its heading and bends toward the leaf. A stem is never shorter than `stems.minLength` (12% of the dome height for the pothos), and a test checks it. Stem width is the same at every stage; only the length scales.

### 3.6 Scale

`scale` resizes the **whole picture** (plant and pot together) as a share of the parent's width. It is applied as a CSS width on the SVG and never enters the generator, so leaf, stem and flower placement is identical at every scale. A test renders the same plant at several scales and checks the markup matches apart from the width.

### 3.7 Fanning the outer leaves

A plant can fan its outer leaves, so they look as if their face points toward the middle while the blade bends away from it. It is optional: a config with no `fan` section (the pothos) is not affected and draws exactly as before.

- **Which leaves.** A leaf is *outer* when its root is at least `fan.outerThreshold` of the way from the middle of the roots to their outer edge (0.5 means the outer half). This is decided per seed from the leaf's gene, not per stage, so a leaf has the same bend at every stage and each stage stays an exact scaled copy of the last.
- **What changes.** An outer leaf gets a `fan` from -1 to 1 (negative bends left, positive right, the same side as its stem leans), drawn from `fan.strength`. The leaf also turns a further `fan.turn` degrees outward, scaled by that strength. Other leaves have a `fan` of 0.
- **How the species draws it.** The engine passes `fan` to the leaf's `outline` function, so the bend is part of the shape that is fitted inside the dome and measured for coverage. The same `fan` is on each placed leaf for the drawing.
- **Random draws.** The fan draws come last in a leaf's random stream and only happen when the config has `fan`, so turning it on never changes a plant's pot, roots, layers or leaf shapes.
- **Limit.** The side limits still apply. A leaf that bends outward reaches the limit sooner, so the fitter makes outer leaves shorter. A larger bend means shorter outer leaves, not wider plants.

### 3.8 Extra parts

`StemmedPlant` draws the pot, then the stems, then the leaves. A species can add its own parts through two optional slots: `renderBehindLeaves` (after the stems, before the leaves) and `renderAboveLeaves` (on top of everything). Both receive the stage being drawn.

## 4. Pothos

Code: `frontend/src/plants/pothos/`. Heart-shaped leaves with golden splashes, in the engine's defaults.

| Setting | Value |
| --- | --- |
| Dome | 56 half-width by 101.4 high (30% taller than the original 78). The rim spans x 52 to 148, so this allows 8 px of overhang each side |
| Leaves | 2 to 6, length 16% to 55% of the dome height |
| Stems | 16% to 62% of the dome height, up to 34 degrees of lean |
| Leaf turn | 10 to 28 degrees outward |
| Look | Heart outline, lighter right half, golden splashes, a midrib, a soft highlight |

Every number is in `pothosConfig.ts`, and `HEART_LEAF_RANGES` and `LEAF_STYLE` hold the leaf's look.

## 5. Peace lily

Code: `frontend/src/plants/peaceLily/`. It uses the stage engine for its leaves, so it follows every rule in [Design rules](#design-rules). Its own numbers are in `peaceLilyConfig.ts`.

**Differences from the pothos**

| Setting | Pothos | Peace lily |
| --- | --- | --- |
| Leaf shape | Heart | Wide pointed blade (`shape.ts`), width 46% to 60% of its length |
| Leaf length | 16% to 55% of the dome height | 21% to 68% |
| Dome | 56 by 101.4 | 56 by 84 |
| Leaves | 2 to 6 | 2 to 8 |
| Stems | 16% to 62%, 34 degrees of lean | 8% to 40%, 30 degrees of lean |
| Leaf turn | 10 to 28 degrees | 4 to 16 degrees (leaves stand more upright) |
| Fan | Off | On: outer half of the roots, strength 0.75 to 1, 8 to 18 extra degrees |
| Extra parts | None | Flowers |

**Fan.** The outer leaves bend outward on a curve: the blade stays upright at its base and its tip sweeps sideways by up to half its length (`LILY_LEAF_FAN.sweep` 0.5, scaled by the leaf's fan). The leaf's own random bow is eased off as it bends, so it reads as one arc. An outer leaf shows its inner face, so its lighter half is the side toward the middle (the right half on other leaves). The shape is in `leaf.ts` (`fannedShape`) and the drawing in `LilyLeafShape.tsx`.

**Flowers** are the peace lily's own, in `flowers.ts`:

- A plant has 1 to 3 flowers. Each is a stalk with a white hood (spathe) and a cream spike (spadix).
- Flowers are placed once, at full size, inside a **flower dome**: the leaf dome stretched upward by `reach.height` (1.75), which only has to hold the tallest flower. Every stage scales them about the soil point with the rest of the plant, so they grow with it.
- A flower head is half the leaf dome height long (`headLength` 0.5). **The top of each head stands between 60% and 120% of the plant's maximum height** (`height` [0.6, 1.2], where the maximum is the leaf dome height, 84). Heads in the middle are higher. At the high end a flower stands above the tallest leaf; at the low end it sits among the leaves.
- A head leans no more than `maxLean` (30 degrees) because of its stalk. A low head has a short stalk, so without this cap it would tip sideways; when it is capped, the stalk bends to arrive along the head's direction.
- **Spread.** Heads fan out evenly from the center, and **no head's middle is more than 30 degrees from straight up** (`maxSpread`). The angle is measured at the soil point, so it holds at any height: a low head sits close to the middle and a high one can sit further out. The outermost heads sit at 30 degrees, with a little random nudge (`slotJitter`, 3 degrees) that never takes one past it.
- Heads are higher in the middle, each on a stalk that rises from the pot (inside the 25% to 75% root range) and bends toward its head. A head that would leave the dome or pass the side limits is pulled in, lowered and then shortened until it fits. The open hood is the widest shape, so fitting it covers the bud too.
- Flower stalks are 2.4 wide at every stage, like the leaf stems.
- **Stages:** none in stages 1 and 2, a closed green and cream **bud** in stage 3 (`budStage`) and an open white **bloom** in stage 4 (`bloomStage`). The same flowers bud and bloom, in the same places. Later stages stay in bloom. A plant with fewer stages never reaches them.

## 6. Pilea peperomioides

Code: `frontend/src/plants/pilea/`. It uses the stage engine for its leaves, so it follows every rule in [Design rules](#design-rules). Its own numbers are in `pileaConfig.ts`.

**Differences from the pothos**

| Setting | Pothos | Pilea |
| --- | --- | --- |
| Leaf shape | Heart | Round, flat coin held face-on (`pileaLeaf.ts`), a near-circular blade whose stalk meets its bottom edge |
| Leaf length | 16% to 55% of the dome height | 32% to 58% (a coin's length is its full height) |
| Dome | 56 by 101.4 | 52 by 80 (a broad, rounded mound) |
| Leaves | 2 to 6 | 2 to 6 (2, 3, 5, 6 over four stages) |
| Stems | 16% to 62%, 34 degrees of lean | 24% to 52%, 30 degrees of lean (thin stalks that radiate from the base) |
| Leaf turn | 10 to 28 degrees | 0 to 12 degrees, with up to 14 degrees of random tilt (coins sit every which way) |
| Fan | Off | Off: the coins are held face-on |
| Extra parts | None | Pups |

**Look.** Each coin is a flat green blade with a lighter right half, fine veins radiating from a central dimple (the peltate attachment), and one soft white highlight. The drawing is in `PileaLeafShape.tsx` and the colors in `pileaLeaf.ts` (`PILEA_LEAF_PALETTE`). Because a coin is near-circular, its outer curve is sampled from the same control points that are drawn, so the engine measures exactly what is shown.

**Pups** are the pilea's own baby plants, computed in `pileaStages.ts` (`pileaPups`):

- A plant has 1 to 2 pup clusters, each a small group of 2 to 3 coins on short stalks, set at the soil beside the main plant (`PILEA_PUPS`).
- Pups are built once at full size from their own random streams, so adding them never moves the main coins. They are drawn through the engine's `renderBehindLeaves` slot and scaled about the soil point with each stage, so they grow with the plant.
- **Stages:** none in stage 1; pups appear from stage 2 (`PILEA_PUPS.fromStage`) and grow with later stages.

## 7. Tests

Over 60 seeds unless noted.

**Engine and pothos** (`pothos/pothosStages.test.tsx`, `staged/engine.test.ts`, `pot/pot.test.tsx`):

- stage counts (2, 3, 5, 6) and never more than 6 leaves for any number of stages,
- exactly the requested number of stages, and deterministic output,
- last stage at least 3.6 times the first in width and height (within rounding),
- every step grows by at least 25%, with more and longer leaves,
- the same width-to-height shape at every stage (even growth),
- every leaf a stage shares with the last stage is that leaf scaled about the soil point,
- every leaf outline above the soil and within the side limits,
- canopy coverage at least 0.15, overlap at most 1.75, and every stem long enough to see,
- every stem rooted between 25% and 75% across the pot, and stems not all from one point,
- leaves at different distances from the origin (stage 3 and up),
- leaf identity and shape unchanged across stages,
- scale changes nothing but the picture size,
- a second plant with different limits follows its own config.

**Pilea** (`pilea/pilea.test.tsx`):

- stage counts (2, 3, 5, 6) and never more than 6 coins for any number of stages,
- exactly the requested number of stages, and deterministic output,
- last stage at least 3.6 times the first in width and height, with longer coins,
- the same width-to-height shape at every stage (even growth),
- every coin a stage shares with the last stage is that coin scaled about the soil point,
- every coin outline above the soil and within the side limits,
- canopy coverage at least 0.15, and every stem rooted between 25% and 75% across the pot,
- coin identity and shape unchanged across stages,
- pups appear from stage 2 and never in stage 1, and there are no flowers,
- scale changes nothing but the picture size.

**Peace lily** (`peaceLily/peaceLily.test.tsx`):

- flower stages: none, none, bud, bloom, and the right markup for each,
- 1 to 3 flowers, deterministic,
- every open flower inside the flower dome, above the soil and within the side limits,
- flower stalks rooted between 25% and 75% across the pot,
- the top of every flower between 60% and 120% of the plant's maximum height, and the range reached at both ends,
- every flower head within 30 degrees of straight up from the soil point, and some heads reaching close to that limit,
- no flower head on top of another,
- 8 leaves at the last stage and never more, leaves within the limits, and leaves scaled with the plant,
- only leaves rooted toward the outside are fanned, each bends away from the middle, and its tip swings that way,
- other leaves are exactly as they were, a leaf's bend is the same at every stage, and the pothos does not fan,
- scale changes nothing but the picture size.

## 8. Open items

- **Stage count.** The backend's growth rules ([8.7](../backend/design.md#87-plant-growth)) have **five** stages (0 to 24%, 25 to 49%, 50 to 74%, 75 to 99%, 100%). The plants default to four. Either map five onto four, or set the default to five and decide when the peace lily blooms.
- **Health.** The backend has three health states (healthy, slightly wilted, wilted). No plant has a wilted look yet.
- **Flower config** is not covered by `validateConfig`. Only the leaf config is checked; the flower numbers are protected by the tests.
- **Dark theme.** Pot and leaf colors are not yet checked on dark surfaces.

## 9. History

- The first pothos was a trailing plant with long vines, then a compact ball built from radiating vines, both driven by a continuous growth value. These were replaced by the stage engine because the old design could not guarantee containment, a leaf cap, or even growth.
- A later draft spread leaf centers evenly over the dome (Lloyd relaxation) and hung every leaf from a stem rising from one point. It looked like a bouquet, so placement was changed to roots spread across 25% to 75% of the pot and stems of different lengths, which puts leaves in layers at different distances from the origin.
- An early stage-engine draft kept every leaf inside a bounding circle. That was safe but too conservative: leaves were small and coverage was 0.3 to 0.5. Fitting the real outline and relaxing leaf centers raised it to about 0.5 to 0.8.
- Leaf length used to be solved at each stage, so leaves did not grow in step with the plant. It is now solved once at full size and reused, so every stage is an exact scaled copy of the last. This removed the per-stage search settings.
- The pothos dome was made 30% taller (78 to 101.4).
- The peace lily's flowers first started too high in their dome and were shortened to fit, which made them small. They now start lower, and a head that does not fit is lowered before it is shortened.
- The peace lily gained up to 8 leaves (from 6), outer leaves that fan outward, flower tops placed between 60% and 120% of the plant's maximum height, and flowers kept within 30 degrees of the center. Placing a head by its middle was needed for the spread: a first version let a leaning head drift past the limit, and the retry lowered it until it sank below the soil.
- The pot's dotted band was removed. Pots that would have had dots now get the stripe, and the choice keeps every plain pot plain.
- The pilea was ported from the older continuous-growth engine onto the stage engine. Its spiralling coins became round coins on stems that radiate from the base, within the leaf cap, containment and scale rules; its signature pups were kept as an extra part that grows with the plant. The old `Pilea.tsx` and `pileaGenome.ts`, and the continuous-growth helpers they used, were removed.
