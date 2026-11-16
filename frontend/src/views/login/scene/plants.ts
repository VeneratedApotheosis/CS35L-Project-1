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
export const SCENE_PLANTS: readonly ScenePlant[] = [
  // Upper back shelf: leafy plants with one pop of color.
  { id: "back-upper-1", type: "pothos", x: 735, y: 328, size: 130, stage: 3, wilt: 0.0, seed: 27, pot: { color: "terracotta" }, shelf: "back-upper" },
  { id: "back-upper-2", type: "kimberly_queen", x: 830, y: 328, size: 142, stage: 4, wilt: 0.0, seed: 34, pot: { color: "teal" }, mirror: true, shelf: "back-upper" },
  { id: "back-upper-3", type: "pilea", x: 925, y: 328, size: 126, stage: 3, wilt: 0.0, seed: 41, pot: { color: "terracotta" }, shelf: "back-upper" },
  { id: "back-upper-4", type: "lily", x: 1020, y: 328, size: 148, stage: 4, wilt: 0.0, seed: 48, pot: { color: "terracotta" }, mirror: true, shelf: "back-upper" },
  { id: "back-upper-5", type: "pothos", x: 1115, y: 328, size: 120, stage: 2, wilt: 0.0, seed: 55, pot: { color: "slate" }, shelf: "back-upper" },
  { id: "back-upper-6", type: "philodendron", x: 1200, y: 328, size: 138, stage: 4, wilt: 0.0, seed: 62, pot: { color: "navy" }, mirror: true, shelf: "back-upper" },

  // Lower back shelf.
  { id: "back-lower-1", type: "pothos", x: 722, y: 538, size: 150, stage: 4, wilt: 0, seed: 69, pot: { color: "terracotta" }, shelf: "back-lower" },
  { id: "back-lower-2", type: "philodendron", x: 800, y: 543, size: 168, stage: 3, wilt: 0, seed: 76, pot: { color: "navy" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-3", type: "pothos", x: 880, y: 536, size: 150, stage: 4, wilt: 0.35, seed: 83, pot: { color: "terracotta" }, shelf: "back-lower" },
  { id: "back-lower-4", type: "monstera", x: 960, y: 541, size: 182, stage: 4, wilt: 0, seed: 90, pot: { color: "charcoal" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-5", type: "rose", x: 1040, y: 544, size: 156, stage: 4, wilt: 0, seed: 97, pot: { color: "blush" }, shelf: "back-lower" },
  { id: "back-lower-6", type: "pothos", x: 1120, y: 537, size: 150, stage: 1, wilt: 0, seed: 104, pot: { color: "terracotta" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-7", type: "kimberly_queen", x: 1200, y: 542, size: 140, stage: 4, wilt: 0, seed: 111, pot: { color: "clay" }, shelf: "back-lower" },

  // Shelf along the right wall: nearer plants are bigger.
  { id: "right-shelf-1", type: "pilea", x: 1253, y: 550, size: 150, stage: 4, wilt: 0.0, seed: 118, pot: { color: "slate" } },
  { id: "right-shelf-2", type: "lotus", x: 1320, y: 572, size: 170, stage: 4, wilt: 0.0, seed: 125, pot: { color: "blush" }, mirror: true },
  { id: "right-shelf-3", type: "pothos", x: 1387, y: 594, size: 190, stage: 3, wilt: 0.0, seed: 132, pot: { color: "terracotta" } },

  // Floor row against the back wall, under the lower shelf.
  { id: "wall-back-1", type: "snake_plant", x: 480, y: 704, size: 108, stage: 4, wilt: 0, seed: 139, pot: { color: "slate" } },
  { id: "wall-back-2", type: "pilea", x: 570, y: 708, size: 112, stage: 3, wilt: 0, seed: 146, pot: { color: "slate" }, mirror: true },
  { id: "wall-back-3", type: "pothos", x: 715, y: 702, size: 140, stage: 4, wilt: 0, seed: 153, pot: { color: "terracotta" } },
  { id: "wall-back-4", type: "philodendron", x: 810, y: 706, size: 156, stage: 4, wilt: 0.5, seed: 160, pot: { color: "clay" }, mirror: true },
  { id: "wall-back-5", type: "rose", x: 905, y: 702, size: 150, stage: 4, wilt: 0, seed: 167, pot: { color: "clay" } },
  { id: "wall-back-6", type: "pothos", x: 1000, y: 707, size: 160, stage: 3, wilt: 0, seed: 174, pot: { color: "navy" }, mirror: true },
  { id: "wall-back-7", type: "peace_lily", x: 1095, y: 702, size: 150, stage: 4, wilt: 0, seed: 181, pot: { color: "cream" } },
  { id: "wall-back-8", type: "monstera", x: 1185, y: 706, size: 158, stage: 4, wilt: 0, seed: 188, pot: { color: "clay" }, mirror: true },

  // Floor row down the right wall, growing toward the viewer.
  { id: "wall-right-1", type: "pothos", x: 1220, y: 712, size: 165, stage: 4, wilt: 0.0, seed: 195, pot: { color: "terracotta" } },
  { id: "wall-right-2", type: "kimberly_queen", x: 1290, y: 764, size: 220, stage: 4, wilt: 0.0, seed: 202, pot: { color: "slate" }, mirror: true },
  { id: "wall-right-3", type: "philodendron", x: 1377, y: 829, size: 295, stage: 4, wilt: 0.0, seed: 209, pot: { color: "charcoal" } },

  // Floor row down the left wall. Kept low, so the plants stay below the text.
  { id: "wall-left-1", type: "pilea", x: 380, y: 712, size: 120, stage: 3, wilt: 0.0, seed: 216, pot: { color: "clay" } },
  { id: "wall-left-2", type: "pothos", x: 310, y: 764, size: 175, stage: 4, wilt: 0.0, seed: 223, pot: { color: "navy" }, mirror: true },
  { id: "wall-left-3", type: "monstera", x: 222, y: 829, size: 245, stage: 4, wilt: 0.0, seed: 230, pot: { color: "teal" } },
  { id: "wall-left-4", type: "kimberly_queen", x: 117, y: 907, size: 335, stage: 4, wilt: 0.0, seed: 237, pot: { color: "navy" }, mirror: true },

  // The two biggest plants: one filling the right edge, one low in the front.
  { id: "big-1", type: "monstera", x: 1590, y: 945, size: 660, stage: 4, wilt: 0.0, seed: 244, pot: { color: "clay" } },
  { id: "big-2", type: "pothos", x: 960, y: 1000, size: 420, stage: 4, wilt: 0.0, seed: 251, pot: { color: "terracotta" }, mirror: true },
]
