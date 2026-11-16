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
  // Upper back shelf: leafy plants, a little closer than their width.
  { id: "back-upper-1", type: "pothos", x: 725, y: 326, size: 126, stage: 4, wilt: 0.0, seed: 47, pot: { color: "charcoal" }, shelf: "back-upper" },
  { id: "back-upper-2", type: "kimberly_queen", x: 794, y: 331, size: 142, stage: 4, wilt: 0.0, seed: 54, pot: { color: "terracotta" }, mirror: true, shelf: "back-upper" },
  { id: "back-upper-3", type: "pilea", x: 862, y: 326, size: 120, stage: 4, wilt: 0.0, seed: 61, pot: { color: "terracotta" }, shelf: "back-upper" },
  { id: "back-upper-4", type: "lily", x: 931, y: 331, size: 148, stage: 4, wilt: 0.0, seed: 68, pot: { color: "charcoal" }, mirror: true, shelf: "back-upper" },
  { id: "back-upper-5", type: "philodendron", x: 999, y: 326, size: 130, stage: 4, wilt: 0.0, seed: 75, pot: { color: "charcoal" }, shelf: "back-upper" },
  { id: "back-upper-6", type: "pothos", x: 1068, y: 331, size: 138, stage: 4, wilt: 0.0, seed: 82, pot: { color: "clay" }, mirror: true, shelf: "back-upper" },
  { id: "back-upper-7", type: "monstera", x: 1137, y: 326, size: 122, stage: 4, wilt: 0.0, seed: 89, pot: { color: "terracotta" }, shelf: "back-upper" },
  { id: "back-upper-8", type: "pilea", x: 1205, y: 331, size: 144, stage: 4, wilt: 0.0, seed: 96, pot: { color: "terracotta" }, mirror: true, shelf: "back-upper" },

  // Lower back shelf: pots touching, leaves overlapping.
  { id: "back-lower-1", type: "pothos", x: 715, y: 536, size: 150, stage: 4, wilt: 0.0, seed: 103, pot: { color: "clay" }, shelf: "back-lower" },
  { id: "back-lower-2", type: "philodendron", x: 776, y: 544, size: 165, stage: 4, wilt: 0.0, seed: 110, pot: { color: "slate" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-3", type: "pothos", x: 837, y: 536, size: 146, stage: 4, wilt: 0.35, seed: 117, pot: { color: "blush" }, shelf: "back-lower" },
  { id: "back-lower-4", type: "monstera", x: 898, y: 544, size: 175, stage: 4, wilt: 0.0, seed: 124, pot: { color: "blush" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-5", type: "rose", x: 959, y: 536, size: 152, stage: 4, wilt: 0.0, seed: 131, pot: { color: "charcoal" }, shelf: "back-lower" },
  { id: "back-lower-6", type: "pothos", x: 1020, y: 544, size: 160, stage: 4, wilt: 0.0, seed: 138, pot: { color: "cream" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-7", type: "kimberly_queen", x: 1081, y: 536, size: 148, stage: 4, wilt: 0.0, seed: 145, pot: { color: "terracotta" }, shelf: "back-lower" },
  { id: "back-lower-8", type: "philodendron", x: 1142, y: 544, size: 170, stage: 4, wilt: 0.0, seed: 152, pot: { color: "sky" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-9", type: "pothos", x: 1203, y: 536, size: 144, stage: 4, wilt: 0.0, seed: 159, pot: { color: "cream" }, shelf: "back-lower" },

  // High shelf along the right wall. Nearer plants are bigger.
  { id: "right-upper-1", type: "pothos", x: 1253, y: 320, size: 130, stage: 4, wilt: 0.0, seed: 166, pot: { color: "blush" } },
  { id: "right-upper-2", type: "philodendron", x: 1320, y: 308, size: 150, stage: 4, wilt: 0.0, seed: 173, pot: { color: "sage" }, mirror: true },
  { id: "right-upper-3", type: "kimberly_queen", x: 1387, y: 296, size: 175, stage: 4, wilt: 0.0, seed: 180, pot: { color: "terracotta" } },

  // Lower shelf along the right wall.
  { id: "right-lower-1", type: "pilea", x: 1253, y: 550, size: 150, stage: 4, wilt: 0.0, seed: 187, pot: { color: "blush" } },
  { id: "right-lower-2", type: "lotus", x: 1320, y: 572, size: 170, stage: 4, wilt: 0.0, seed: 194, pot: { color: "clay" }, mirror: true },
  { id: "right-lower-3", type: "pothos", x: 1387, y: 594, size: 190, stage: 4, wilt: 0.0, seed: 201, pot: { color: "terracotta" } },

  // Floor row against the back wall, under the lower shelf.
  { id: "wall-back-1", type: "snake_plant", x: 470, y: 704, size: 112, stage: 4, wilt: 0.0, seed: 208, pot: { color: "terracotta" } },
  { id: "wall-back-2", type: "pilea", x: 540, y: 708, size: 108, stage: 4, wilt: 0.0, seed: 215, pot: { color: "slate" }, mirror: true },
  { id: "wall-back-3", type: "pothos", x: 610, y: 706, size: 100, stage: 4, wilt: 0.0, seed: 222, pot: { color: "mustard" } },
  { id: "wall-back-4", type: "monstera", x: 715, y: 702, size: 142, stage: 4, wilt: 0.0, seed: 229, pot: { color: "sky" }, mirror: true },
  { id: "wall-back-5", type: "pothos", x: 775, y: 706, size: 150, stage: 4, wilt: 0.0, seed: 236, pot: { color: "terracotta" } },
  { id: "wall-back-6", type: "philodendron", x: 835, y: 700, size: 146, stage: 4, wilt: 0.5, seed: 243, pot: { color: "slate" }, mirror: true },
  { id: "wall-back-7", type: "rose", x: 895, y: 705, size: 156, stage: 4, wilt: 0.0, seed: 250, pot: { color: "clay" } },
  { id: "wall-back-8", type: "kimberly_queen", x: 955, y: 701, size: 150, stage: 4, wilt: 0.0, seed: 257, pot: { color: "navy" }, mirror: true },
  { id: "wall-back-9", type: "pothos", x: 1015, y: 707, size: 160, stage: 4, wilt: 0.0, seed: 264, pot: { color: "cream" } },
  { id: "wall-back-10", type: "peace_lily", x: 1075, y: 702, size: 148, stage: 4, wilt: 0.0, seed: 271, pot: { color: "blush" }, mirror: true },
  { id: "wall-back-11", type: "pothos", x: 1135, y: 706, size: 154, stage: 4, wilt: 0.0, seed: 278, pot: { color: "teal" } },
  { id: "wall-back-12", type: "monstera", x: 1195, y: 703, size: 150, stage: 4, wilt: 0.0, seed: 285, pot: { color: "terracotta" }, mirror: true },

  // A second, staggered floor row in front, so the plants overlap.
  { id: "floor-front-1", type: "monstera", x: 430, y: 748, size: 140, stage: 4, wilt: 0.0, seed: 292, pot: { color: "mustard" } },
  { id: "floor-front-2", type: "pothos", x: 535, y: 752, size: 150, stage: 4, wilt: 0.0, seed: 299, pot: { color: "terracotta" }, mirror: true },
  { id: "floor-front-3", type: "philodendron", x: 655, y: 746, size: 160, stage: 4, wilt: 0.0, seed: 306, pot: { color: "navy" } },
  { id: "floor-front-4", type: "kimberly_queen", x: 765, y: 754, size: 196, stage: 4, wilt: 0.0, seed: 313, pot: { color: "navy" }, mirror: true },
  { id: "floor-front-5", type: "pothos", x: 875, y: 750, size: 210, stage: 4, wilt: 0.0, seed: 320, pot: { color: "slate" } },
  { id: "floor-front-6", type: "snake_plant", x: 985, y: 756, size: 190, stage: 4, wilt: 0.0, seed: 327, pot: { color: "clay" }, mirror: true },
  { id: "floor-front-7", type: "monstera", x: 1095, y: 748, size: 205, stage: 4, wilt: 0.0, seed: 334, pot: { color: "charcoal" } },
  { id: "floor-front-8", type: "lily", x: 1195, y: 752, size: 190, stage: 4, wilt: 0.0, seed: 341, pot: { color: "sky" }, mirror: true },

  // The back-right corner: tall plants up to the roof, then a row down the right wall.
  { id: "corner-1", type: "monstera", x: 1250, y: 690, size: 360, stage: 4, wilt: 0.0, seed: 348, pot: { color: "clay" } },
  { id: "corner-2", type: "pothos", x: 1172, y: 698, size: 300, stage: 4, wilt: 0.0, seed: 355, pot: { color: "sage" }, mirror: true },
  { id: "corner-3", type: "kimberly_queen", x: 1225, y: 715, size: 300, stage: 4, wilt: 0.0, seed: 362, pot: { color: "terracotta" } },
  { id: "corner-4", type: "philodendron", x: 1300, y: 770, size: 400, stage: 4, wilt: 0.0, seed: 369, pot: { color: "charcoal" }, mirror: true },
  { id: "corner-5", type: "pothos", x: 1395, y: 845, size: 500, stage: 4, wilt: 0.0, seed: 376, pot: { color: "clay" } },

  // Row down the left wall. Kept low, so the plants stay below the text.
  { id: "wall-left-1", type: "pilea", x: 380, y: 712, size: 120, stage: 4, wilt: 0.0, seed: 383, pot: { color: "clay" } },
  { id: "wall-left-2", type: "pothos", x: 327, y: 751, size: 165, stage: 4, wilt: 0.0, seed: 390, pot: { color: "terracotta" }, mirror: true },
  { id: "wall-left-3", type: "monstera", x: 275, y: 790, size: 205, stage: 4, wilt: 0.0, seed: 397, pot: { color: "mustard" } },
  { id: "wall-left-4", type: "philodendron", x: 205, y: 842, size: 262, stage: 4, wilt: 0.0, seed: 404, pot: { color: "cream" }, mirror: true },
  { id: "wall-left-5", type: "kimberly_queen", x: 117, y: 907, size: 335, stage: 4, wilt: 0.0, seed: 411, pot: { color: "mustard" } },

  // The biggest plant, filling the right edge.
  { id: "big-1", type: "monstera", x: 1590, y: 945, size: 660, stage: 4, wilt: 0.0, seed: 418, pot: { color: "clay" } },
]
