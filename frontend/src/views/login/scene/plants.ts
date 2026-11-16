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
  // Upper back shelf: small plants.
  { id: "back-upper-1", type: "pilea", x: 802, y: 372, size: 78, stage: 3, wilt: 0.0, seed: 17, pot: { color: "terracotta" }, shelf: "back-upper" },
  { id: "back-upper-2", type: "pothos", x: 866, y: 372, size: 92, stage: 4, wilt: 0.0, seed: 24, pot: { color: "slate" }, mirror: true, shelf: "back-upper" },
  { id: "back-upper-3", type: "snake_plant", x: 930, y: 372, size: 72, stage: 2, wilt: 0.0, seed: 31, pot: { color: "cream" }, shelf: "back-upper" },
  { id: "back-upper-4", type: "kimberly_queen", x: 996, y: 372, size: 88, stage: 4, wilt: 0.0, seed: 38, pot: { color: "cream" }, mirror: true, shelf: "back-upper" },
  { id: "back-upper-5", type: "pilea", x: 1060, y: 372, size: 80, stage: 3, wilt: 0.0, seed: 45, pot: { color: "terracotta" }, shelf: "back-upper" },
  { id: "back-upper-6", type: "peace_lily", x: 1125, y: 372, size: 94, stage: 4, wilt: 0.0, seed: 52, pot: { color: "clay" }, mirror: true, shelf: "back-upper" },
  { id: "back-upper-7", type: "philodendron", x: 1190, y: 372, size: 76, stage: 2, wilt: 0.0, seed: 59, pot: { color: "blush" }, shelf: "back-upper" },

  // Lower back shelf.
  { id: "back-lower-1", type: "pothos", x: 690, y: 526, size: 96, stage: 4, wilt: 0.0, seed: 66, pot: { color: "blush" }, shelf: "back-lower" },
  { id: "back-lower-2", type: "pilea", x: 738, y: 531, size: 84, stage: 3, wilt: 0.0, seed: 73, pot: { color: "sage" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-3", type: "kimberly_queen", x: 785, y: 524, size: 110, stage: 4, wilt: 0.0, seed: 80, pot: { color: "navy" }, shelf: "back-lower" },
  { id: "back-lower-4", type: "rose", x: 833, y: 529, size: 92, stage: 2, wilt: 0.0, seed: 87, pot: { color: "sky" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-5", type: "snake_plant", x: 881, y: 532, size: 118, stage: 3, wilt: 0.35, seed: 94, pot: { color: "sage" }, shelf: "back-lower" },
  { id: "back-lower-6", type: "lily", x: 929, y: 525, size: 100, stage: 4, wilt: 0.0, seed: 101, pot: { color: "mustard" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-7", type: "pothos", x: 976, y: 530, size: 88, stage: 1, wilt: 0.0, seed: 108, pot: { color: "sky" }, shelf: "back-lower" },
  { id: "back-lower-8", type: "peace_lily", x: 1024, y: 527, size: 112, stage: 4, wilt: 0.0, seed: 115, pot: { color: "teal" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-9", type: "pilea", x: 1072, y: 531, size: 86, stage: 3, wilt: 0.0, seed: 122, pot: { color: "clay" }, shelf: "back-lower" },
  { id: "back-lower-10", type: "monstera", x: 1120, y: 524, size: 124, stage: 2, wilt: 0.0, seed: 129, pot: { color: "terracotta" }, mirror: true, shelf: "back-lower" },
  { id: "back-lower-11", type: "kimberly_queen", x: 1167, y: 529, size: 104, stage: 4, wilt: 0.0, seed: 136, pot: { color: "blush" }, shelf: "back-lower" },
  { id: "back-lower-12", type: "pothos", x: 1215, y: 526, size: 98, stage: 3, wilt: 0.0, seed: 143, pot: { color: "terracotta" }, mirror: true, shelf: "back-lower" },

  // Shelf along the right wall.
  { id: "right-return-1", type: "pilea", x: 1251, y: 537, size: 82, stage: 3, wilt: 0.0, seed: 150, pot: { color: "terracotta" } },
  { id: "right-return-2", type: "lotus", x: 1304, y: 552, size: 92, stage: 4, wilt: 0.0, seed: 157, pot: { color: "slate" }, mirror: true },
  { id: "right-return-3", type: "rose", x: 1356, y: 568, size: 104, stage: 4, wilt: 0.0, seed: 164, pot: { color: "terracotta" } },

  // Floor, back row.
  { id: "floor-back-1", type: "monstera", x: 430, y: 706, size: 104, stage: 4, wilt: 0.0, seed: 171, pot: { color: "teal" } },
  { id: "floor-back-2", type: "pothos", x: 540, y: 708, size: 108, stage: 3, wilt: 0.0, seed: 178, pot: { color: "terracotta" }, mirror: true },
  { id: "floor-back-3", type: "peace_lily", x: 650, y: 702, size: 108, stage: 4, wilt: 0.5, seed: 185, pot: { color: "mustard" } },
  { id: "floor-back-4", type: "rose", x: 765, y: 706, size: 130, stage: 4, wilt: 0.0, seed: 192, pot: { color: "slate" }, mirror: true },
  { id: "floor-back-5", type: "snake_plant", x: 880, y: 700, size: 140, stage: 3, wilt: 0.0, seed: 199, pot: { color: "clay" } },
  { id: "floor-back-6", type: "philodendron", x: 1000, y: 708, size: 128, stage: 2, wilt: 0.0, seed: 206, pot: { color: "navy" }, mirror: true },
  { id: "floor-back-7", type: "lily", x: 1115, y: 702, size: 136, stage: 4, wilt: 0.0, seed: 213, pot: { color: "clay" } },
  { id: "floor-back-8", type: "kimberly_queen", x: 1215, y: 707, size: 122, stage: 3, wilt: 0.0, seed: 220, pot: { color: "charcoal" }, mirror: true },
  { id: "floor-back-9", type: "pilea", x: 1300, y: 712, size: 120, stage: 4, wilt: 0.0, seed: 227, pot: { color: "charcoal" } },

  // Floor, middle row.
  { id: "floor-mid-1", type: "philodendron", x: 300, y: 770, size: 170, stage: 4, wilt: 0.0, seed: 234, pot: { color: "navy" } },
  { id: "floor-mid-2", type: "pothos", x: 470, y: 782, size: 176, stage: 4, wilt: 0.3, seed: 241, pot: { color: "cream" }, mirror: true },
  { id: "floor-mid-3", type: "monstera", x: 640, y: 776, size: 190, stage: 3, wilt: 0.0, seed: 248, pot: { color: "terracotta" } },
  { id: "floor-mid-4", type: "kimberly_queen", x: 810, y: 786, size: 205, stage: 4, wilt: 0.0, seed: 255, pot: { color: "slate" }, mirror: true },
  { id: "floor-mid-5", type: "rose", x: 960, y: 780, size: 195, stage: 4, wilt: 0.0, seed: 262, pot: { color: "terracotta" } },
  { id: "floor-mid-6", type: "peace_lily", x: 1105, y: 790, size: 215, stage: 3, wilt: 0.0, seed: 269, pot: { color: "sage" }, mirror: true },
  { id: "floor-mid-7", type: "snake_plant", x: 1250, y: 784, size: 225, stage: 4, wilt: 0.0, seed: 276, pot: { color: "sage" } },
  { id: "floor-mid-8", type: "monstera", x: 1395, y: 792, size: 230, stage: 4, wilt: 0.0, seed: 283, pot: { color: "slate" }, mirror: true },

  // Foreground: the big plants near the viewer.
  { id: "foreground-1", type: "pothos", x: 110, y: 905, size: 300, stage: 4, wilt: 0.0, seed: 290, pot: { color: "slate" } },
  { id: "foreground-2", type: "peace_lily", x: 365, y: 900, size: 285, stage: 4, wilt: 0.0, seed: 297, pot: { color: "teal" }, mirror: true },
  { id: "foreground-3", type: "kimberly_queen", x: 1130, y: 885, size: 300, stage: 3, wilt: 0.0, seed: 304, pot: { color: "terracotta" } },
  { id: "foreground-4", type: "philodendron", x: 1300, y: 905, size: 340, stage: 4, wilt: 0.0, seed: 311, pot: { color: "sky" }, mirror: true },
  { id: "foreground-5", type: "monstera", x: 1500, y: 915, size: 430, stage: 4, wilt: 0.0, seed: 318, pot: { color: "slate" } },
]
