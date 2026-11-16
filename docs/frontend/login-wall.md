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

- **Layout.** A grid: the words in the left column (a third of the screen, never under 22rem), the wall in the rest. Below 39rem the wall is a single shelf above the words, on the page's own background (no sage panel).
- **Pots never scale.** Every size is in pixels (`POT_SIZE` 280, `PITCH` 190, `ROW_PITCH` 300 in `layouts.ts`). As the screen narrows the wall shows **fewer pots**, not smaller ones. `ShelfWall` measures itself (a `ResizeObserver`) and `wallFit` says how many pots fit across (up to 4) and how many shelves fit down (up to 4), capped at the eight plants: two shelves of four on a big screen, then fewer pots per shelf, then fewer shelves. Beside the words it keeps at least one pot. When not even one pot fits beside the words (the wall column is under about 17rem) the screen stacks: one shelf above the words with as many pots as fit across the screen, down to one on a phone. `wallLayout` places the pots on staggered shelves. Nothing is drawn until the wall is measured, so a phone never flashes the desktop wall.
- **Plant order.** `WALL_PLANTS` lists the eight plants in the order they are kept as the wall shrinks, so a flowering plant is among the first. The wall shows the first N of them.
- **Plants.** Every plant is fully grown (stage 4) and every pot is terracotta. The seed still varies the pot's band. The set has the three flowering plants (rose, peace lily, lily) and a mix of shapes: tall, broad, trailing and low.
- **Grow-in.** The one animated moment. Each plant is drawn at stage 3 and grows into stage 4 shortly after load, one after another, using the app's stage-up animation. With `prefers-reduced-motion` the plants go to stage 4 at once.
- **Replanting.** Move the pointer onto a plant and, with no wait, it un-grows: the stage-up animation plays backwards, very fast (SHRINK_MS, 100 ms), down to a sprout. The sprout then goes away and the pot is left bare, with just soil, for BARE_MS. The plant is swapped for a new random plant (a random one of the wall's eight species, a random seed, the same pot) while the pot is bare, so one plant never visibly jumps into another. Then the new plant grows out of the soil: it starts with no leaves (the opt-in EmergeProvider in pottedPlant/plants/staged/) and its leaves grow in one stage-up animation straight to stage 4, with the stage-up bursts, so it never pops into view. The pointer works at any moment, even in the middle of an animation: a plant that is growing un-grows from the way it looks right then (with no jump), and a sprout or a bare pot gets its new plant at once. Only a plant already un-growing is left to finish. On touch screens, a touch does the same. With prefers-reduced-motion the new plant just appears fully grown. The hit area is an invisible box around the plant's leaves, and it leaves out the pot. Once a plant is full grown and its animation has settled, the box is measured from the outlines of the drawn leaves (HIT_PADDING adds a few units around them); until then it is the estimate HIT_DEFAULT. The timings are the constants at the top of ShelfWall.tsx. The backwards animation is the opt-in ShrinkProvider in pottedPlant/plants/staged/: without it, plants everywhere else still change stage at once when they go down.
- **Theme.** The screen follows the app theme. Colors are the tokens `--color-wall`, `--color-wall-shade`, `--color-shelf`, `--color-shelf-top` and `--color-shelf-edge` (palette values in `tokens/colors.css`, mapped in both themes).
- **Accessibility.** The wall is `aria-hidden`: the words say everything it does. The title is the page's only `h1`.

## Changing the plants

In `layouts.ts`:

- **Which plants.** Edit `WALL_PLANTS`. Change `type` or `seed` (the same seed always draws the same plant). `mirror` flips a plant.
- **How many fit and where they go.** The constants above `wallFit` (`POT_SIZE`, `PITCH`, `ROW_PITCH`, `SHELF_MARGIN`, `STAGGER`, `MAX_COLS`, `MAX_ROWS`) and the `scale` of each plant (its picture's size as a share of `POT_SIZE`, up to `MAX_SCALE`). The stacked breakpoint is `STACKED_QUERY` and must match the media query in `login.css`.

`wall.test.ts` fails if a pot hangs off its board, two pots touch, a plant leaves the canvas or reaches the shelf above, or a size is off. It also checks that pots only get fewer as the wall narrows and that one pot always fits.

## Open items

- Google's branding: the button has to follow Google's sign-in button guidelines before launch.
