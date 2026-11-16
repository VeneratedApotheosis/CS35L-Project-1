# Login screen and its shelf wall

The login screen has the words on the left third and a picture on the right two thirds: eight terracotta pots on light wood shelves, on a sage wall. For what the screen does, see [screens.md](screens.md#1-login). For how plants and pots are drawn, see [plant-generation.md](plant-generation.md).

## Where the code is

```
frontend/src/views/
  Login.tsx                 the screen: the words and the sign-in logic
  Login.test.tsx            the screen's behavior
  login/
    GoogleIcon.tsx          Google's logo (its colors are fixed, not theme tokens)
    wall/
      layouts.ts            THE EIGHT PLANTS and the two layouts: the file you edit
      ShelfWall.tsx         draws the shelves and plants, and the grow-in
      wall.test.ts          the checks on the plant list and both layouts
frontend/src/styles/components/login.css   the screen's grid and the wall's colors
```

## How it works

- **Layout.** A grid: the words in the left column (one third), the wall in the right (two thirds). Below 64rem the wall moves above the words.
- **Two layouts, one plant list.** `WALL_PLANTS` lists the eight plants in reading order. `WIDE_LAYOUT` places them on **two shelves of four** (64rem and up). `TALL_LAYOUT` places the same list on **three shelves of 3, 3 and 2**, so each pot stays large on narrow screens. Both SVGs are drawn and CSS shows one.
- **Plants.** Every plant is fully grown (stage 4) and every pot is terracotta. The seed still varies the pot's band. The set has the three flowering plants (rose, peace lily, lily) spread apart, and a mix of shapes: tall, broad, trailing and low.
- **Grow-in.** The one animated moment. Each plant is drawn at stage 3 and grows into stage 4 shortly after load, one after another, using the app's stage-up animation. With `prefers-reduced-motion` the plants go to stage 4 at once.
- **Replanting.** Move the pointer onto a plant and, with no wait, it un-grows: the stage-up animation plays backwards, very fast (SHRINK_MS, 100 ms), down to a sprout. The sprout then goes away and the pot is left bare, with just soil, for BARE_MS. The plant is swapped for a new random plant (a random one of the wall's eight species, a random seed, the same pot) while the pot is bare, so one plant never visibly jumps into another. Then the new plant grows out of the soil: it starts with no leaves (the opt-in EmergeProvider in pottedPlant/plants/staged/) and its leaves grow in one stage-up animation straight to stage 4, with the stage-up bursts, so it never pops into view. The pointer works at any moment, even in the middle of an animation: a plant that is growing un-grows from the way it looks right then (with no jump), and a sprout or a bare pot gets its new plant at once. Only a plant already un-growing is left to finish. On touch screens, a touch does the same. With prefers-reduced-motion the new plant just appears fully grown. The hit area is an invisible box around the plant's leaves, and it leaves out the pot. Once a plant is full grown and its animation has settled, the box is measured from the outlines of the drawn leaves (HIT_PADDING adds a few units around them); until then it is the estimate HIT_DEFAULT. The timings are the constants at the top of ShelfWall.tsx. The backwards animation is the opt-in ShrinkProvider in pottedPlant/plants/staged/: without it, plants everywhere else still change stage at once when they go down.
- **Theme.** The screen follows the app theme. Colors are the tokens `--color-wall`, `--color-wall-shade`, `--color-shelf`, `--color-shelf-top` and `--color-shelf-edge` (palette values in `tokens/colors.css`, mapped in both themes).
- **Accessibility.** The wall is `aria-hidden`: the words say everything it does. The title is the page's only `h1`.

## Changing the plants

In `layouts.ts`:

- **Which plants.** Edit `WALL_PLANTS`. Change `type` or `seed` (the same seed always draws the same plant). `mirror` flips a plant.
- **Where they go.** Edit the `slots` of `WIDE_LAYOUT` and `TALL_LAYOUT`. A slot is the middle of the pot (`x`), its shelf, and the width of its picture (`size`). Numbers are layout units, not pixels.
- **Shelves.** Edit the `shelves`: `y` is the front top edge and `from` and `to` are the ends.

`wall.test.ts` fails if a pot hangs off its board, two pots touch, a plant leaves the canvas or reaches the shelf above, or the plant counts per shelf change.

## Open items

- Google's branding: the button has to follow Google's sign-in button guidelines before launch.
