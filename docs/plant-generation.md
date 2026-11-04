# Plant generation

Plants are drawn as SVG from a **seed**. The same seed always gives the same plant, so a habit can store one integer (e.g. its id) and the plant is rebuilt on every screen.

Code lives in `frontend/src/plants/`. A live prototype is at `/plants`. Run the tests with `npm test` in `frontend/`.

Status:

| Plant | Engine | State |
| --- | --- | --- |
| Pothos | Stage engine (this document) | Current |
| Pilea peperomioides | Older continuous-growth engine | Works; to be ported to the stage engine |
| Peace lily | Older continuous-growth engine | Benched: code kept, not shown on `/plants` |

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
4. Draw it with `StemmedPlant`, passing a function that draws one leaf and a stem style.

No number is hard-coded in the engine. `staged/engine.test.ts` builds a second plant with different limits to show it follows its own config.

---

## 1. Style: Animal Crossing: New Horizons icons

| Trait | How we draw it |
| --- | --- |
| No outlines | Flat fills. Edges come from a lighter or darker second tone, never a stroke. |
| Two-tone shading | Each leaf has a lighter half (right of the midrib) over the base green. |
| Soft highlight | One small, low-opacity white oval per leaf and per pot. |
| Round, chunky forms | Wide hearts, blunt lobes, thick pot lip. |
| Friendly palette | Saturated but gentle: leaf green `hsl(118 46% 42%)`, golden splashes `hsl(52 78% 72%)`, terracotta `#e08a5c`. |
| Grounded | A soft oval shadow under the pot. |

## 2. Pot

Code: `frontend/src/plants/pot/`. A low drum pot (body 46 tall) built from a rounded **rim**, a tapered **body**, a dark **soil** oval, and a **shadow** oval. The seed picks a palette (terracotta, cream, sage, sky, blush) and a band (none, stripe, or dots). The pot never changes size with the plant.

Every measurement is a named value in `pot/shape.ts` (`POT_SHAPE`). Two of them are used by the plants: `POT_RIM` (where stems are placed across the pot) and `POT_SOIL` (where plants meet the pot, which becomes the shared `SOIL` point). Neither number is repeated anywhere else, so changing the pot's shape moves the plants with it.

## 3. Stage engine (pothos)

A plant is a seed plus a **stage number** from 1 to S (default 4). There is no continuous growth value and no in-between frame. `createPothos(seed, { stages })` returns S stage layouts; `<Pothos seed stage />` draws one.

### 3.1 The envelope

Every stage places its leaves inside an **envelope**: a half-ellipse dome standing on the soil point `(100, 148)`.

- Final stage: 56 half-width by 101.4 high (30% taller than the original 78). The rim spans x 52 to 148, so this allows 8 px of overhang each side.
- Stage k is the same dome **scaled about the soil point**, so the plant grows evenly in every direction. Leaves, stems and roots scale with it (see 3.3).
- Scales form a geometric ladder ending at 1, with a last:first ratio of 3.6. For four stages: 0.28, 0.43, 0.65, 1.

### 3.2 Leaves per stage

At most 6. Four stages give **2, 3, 5, 6** leaves. Both the number of leaves and the dome grow at every step, and leaves are longer at every step, so each stage visibly changes.

### 3.3 Placement: roots, stems and layers

Every leaf hangs from its own stem, and no two leaves share the same root or the same height.

1. **Genes (per seed, shared by all stages).** Leaf `i` has its own sub-seed, so its shape, length factor, jitter and curl never change between stages.
2. **Root.** Each stem starts at its own spot across the pot, between **25% and 75%** of the way from the left rim to the right rim (so x 76 to 124 at the last stage). A golden-ratio sequence spreads the roots, so any run of leaves is spread across the pot. Roots scale in toward the center at smaller stages, like everything else.
3. **Heading.** Stems on the left lean left and stems on the right lean right, by up to 34 degrees, so the plant fans outward a little. The leaf turns a further 10 to 28 degrees outward at the end of its stem.
4. **Layer.** Each leaf has a layer from 0 (nearest the soil) to 1 (highest). Even-numbered leaves take the low band (0 to 0.4) and odd-numbered leaves take the high band (0.6 to 1), so even two leaves sit at clearly different distances from the origin. The layer sets the stem length: from 16% of the dome height up to however far the leaf still fits under the top of the dome, so layers keep their spacing at every stage and leaf size. Lower layers are drawn on top.
5. **Fitting (hard guarantee).** The real leaf outline, sampled from the same Beziers that are drawn, must sit inside the dome and above the soil line. If it does not, the stem is shortened a little (down to 55% of its layer length), and if that is not enough the leaf is shortened by 10% and tried again.
6. **Leaf length.** The solver runs **once, on the full-size plant**: it tries 14 lengths between 16% and 55% of the dome height and keeps the smallest one that covers 60% of the canopy without stacking too deep. That length, as a share of the dome height, is then used at **every** stage. Leaves therefore grow exactly as fast as the dome: leaf length, stem length, root position and leaf direction at any stage are the full-size values scaled about the soil point. A stage differs from the last only in its scale and in how many leaves it shows (the first n).

This is tested: every leaf a stage shares with the last stage must be that leaf scaled by the stage's scale.

Because the dome is inside the allowed box (x 44 to 156, y at most 148), no leaf can spill under the pot or far to either side, at any stage.

### 3.4 Coverage and overlap

Coverage is the share of sample points in the canopy (the dome above 20% of its height) that lie inside some leaf. The solver aims for 0.6 at the full-size stage using the smallest leaves that get there. Earlier stages show fewer leaves at the same proportions, so they cover less: measured over seeds 1 to 60 it averages about 0.28, 0.39, 0.53 and 0.59 for stages 1 to 4. It also measures **overlap**: the average number of leaves stacked at a covered point, kept at or below 1.6. Tests enforce coverage of at least 0.15 and overlap of at most 1.75.

### 3.4a Stems

Every leaf hangs from a visible stem, 2.6 units wide, that rises along its heading and bends toward the leaf. A stem is never shorter than 12% of the dome height, and a test checks it.

### 3.5 Scale

`scale` resizes the **whole picture** (plant and pot together) as a share of the parent's width. It is applied as a CSS width on the SVG and never enters the generator, so leaf and stem placement is identical at every scale. A test renders the same plant at several scales and checks the markup matches apart from the width.

## 4. Tests

`src/plants/pothos/pothosStages.test.tsx` checks, over 60 seeds:

- stage counts (2, 3, 5, 6) and never more than 6 leaves for any number of stages,
- exactly the requested number of stages, and deterministic output,
- last stage at least 3.5 times the first in width and height,
- every step grows by at least 25%, with more and longer leaves,
- the same width-to-height shape at every stage (even growth),
- every leaf outline above the soil and within the side limits,
- canopy coverage at least 0.15, overlap at most 1.75, and every stem long enough to see,
- every stem rooted between 25% and 75% across the pot, and stems not all from one point,
- leaves at different distances from the origin (stage 3 and up),
- leaf identity and shape unchanged across stages,
- scale changes nothing but the picture size.

## 5. Pilea peperomioides (older engine)

Code: `pileaGenome.ts` and `Pilea.tsx`. Round coin leaves on thin stalks spiral out from a short stem. Old leaves are low and large; new ones are small and upright. One to two pups (baby plants) appear beside the main plant. It still uses a continuous growth value with four anchor stages and a `size` parameter that changes leaf count. It does not yet follow the leaf cap, containment or scale rules above and is due to be ported.

## 6. Peace lily

Code: `frontend/src/plants/peaceLily/`. It uses the stage engine for its leaves, so it has the same rules as the pothos (four stages, at most 6 leaves, scaled copies, containment, `scale` never moves anything). Its leaves are wide, pointed blades (`shape.ts`), and every number is in `peaceLilyConfig.ts`.

**Flowers** are the peace lily's own, in `flowers.ts`:

- A plant has 1 to 3 flowers. Each is a stalk with a white hood (spathe) and a cream spike (spadix).
- Flowers are placed once, at full size, inside a **flower dome**: the leaf dome stretched upward (`reach.height`), so flowers stand above the leaves. Every stage scales them about the soil point with the rest of the plant, so they grow with it.
- Heads are spread across the dome, higher in the middle, each on a stalk that rises from the pot (inside the 25% to 75% root range) and bends toward its head. A head that would leave the dome or pass the side limits is pulled in, lowered and shortened until it fits. The open hood is the widest shape, so fitting it covers the bud too.
- **Stages:** none in stages 1 and 2, a closed green and cream **bud** in stage 3 (`budStage`) and an open white **bloom** in stage 4 (`bloomStage`). The same flowers bud and bloom, in the same places.

The engine draws the plant; the lily adds flowers through two slots on `StemmedPlant`: `renderBehindLeaves` (stalks) and `renderAboveLeaves` (heads). The tests are in `peaceLily.test.tsx`.

## 7. History

- The first pothos was a trailing plant with long vines, then a compact ball built from radiating vines, both driven by a continuous growth value. These were replaced by the stage engine because the old design could not guarantee containment, a leaf cap, or even growth.
- A later draft spread leaf centers evenly over the dome (Lloyd relaxation) and hung every leaf from a stem rising from one point. It looked like a bouquet, so placement was changed to roots spread across 25% to 75% of the pot and stems of different lengths, which puts leaves in layers at different distances from the origin.
- An early stage-engine draft kept every leaf inside a bounding circle. That was safe but too conservative: leaves were small and coverage was 0.3 to 0.5. Fitting the real outline and relaxing leaf centers raised it to about 0.5 to 0.8.
