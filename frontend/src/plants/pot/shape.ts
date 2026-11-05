/*
 * Everything about how the pot is drawn, in the shared plant canvas (200 wide,
 * y growing downward). Sizes are canvas units unless a field says otherwise.
 * The pot is a low drum: a shadow, a tapered body, a rim on top, and a dark
 * soil oval inside the rim.
 */
export const POT_SHAPE = {
  /** The tapered body. Its outline is a path; its top edge is hidden behind the rim. */
  body: {
    path: "M58 160 L142 160 L136 200 Q135 206 128 206 L72 206 Q65 206 64 200 Z",
    /** The smallest box around the path. Finishes use it to cover the whole body. */
    bounds: { x: 58, y: 160, width: 84, height: 46 },
    /** Added to the pot's id to name its clip path. */
    clipIdSuffix: "-pot",
  },

  /** The soft oval under the pot. */
  shadow: { cx: 100, cy: 210, rx: 54, ry: 6, color: "#342f29", opacity: 0.14 },

  /** The darker right side of the body. */
  shade: { x: 118, y: 150, width: 40, height: 60, opacity: 0.45 },

  /** The painted stripe. Thickness is per unit of `size`. */
  stripe: { x: 50, centerY: 185, width: 100, thickness: 8 },

  /** The soft vertical highlight on the left of the body. Width is per unit of `size`. */
  highlight: { x: 69, y: 168, width: 6, height: 30, color: "#fff", opacity: 0.22 },

  /** The rim on top of the body. */
  rim: { x: 52, y: 144, width: 96, height: 20, cornerRadius: 10 },

  /** The short highlight along the top of the rim. */
  rimHighlight: { x: 60, y: 147, width: 40, height: 3.5, cornerRadius: 1.75, color: "#fff", opacity: 0.35 },

  /** The soil oval. Its center is where every plant meets the pot. */
  soil: { cx: 100, cy: 148, rx: 40, ry: 6, color: "#6e4f3b" },

  /** The lighter patch on the soil. */
  soilHighlight: { cx: 92, cy: 147, rx: 20, ry: 3, color: "#85634c" },
}

/** The pot body: its outline path and bounding box. What a finish is drawn onto. */
export type PotBody = typeof POT_SHAPE.body

/** The pot rim, left to right. Plants place their stems as a share of this width. */
export const POT_RIM = {
  left: POT_SHAPE.rim.x,
  right: POT_SHAPE.rim.x + POT_SHAPE.rim.width,
}

/** Where plants meet the soil: the center of the soil oval. */
export const POT_SOIL = { x: POT_SHAPE.soil.cx, y: POT_SHAPE.soil.cy }
