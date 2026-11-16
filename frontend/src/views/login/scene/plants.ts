import type { ScenePlant } from "./types"

/**
 * Every plant in the login scene. This is the one list to edit: change a plant's
 * type, size, growth stage, wilt, seed or pot here and the picture follows.
 * Open /login?dev (in development) to see each plant's label, then click a plant
 * to change it live and copy its line back into this list.
 *
 * Where things go (scene units, on a canvas 1600 wide and 900 tall):
 * - x, y is the middle of the pot's bottom edge. A plant on a shelf names the
 *   shelf in `shelf`, and its y must be on the shelf's top (the tests check it).
 * - size is the width of the plant's picture. A pot is about half of it:
 *   about 70 to 120 for shelf plants, 140 to 200 for floor plants, and 240 to
 *   450 for the big plants near the viewer.
 * - Keep plants out of the text area on the left (SAFE_ZONE in room.ts).
 *
 * Plants are drawn from the back (smaller y) to the front.
 */
export const SCENE_PLANTS: readonly ScenePlant[] = []
