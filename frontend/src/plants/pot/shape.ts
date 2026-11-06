/*
 * Everything about how the pot is drawn, in the shared plant canvas (200 wide,
 * y growing downward). Sizes are canvas units unless a field says otherwise.
 * The pot is a low drum: a shadow, a tapered body, a rim on top, and a dark
 * soil oval inside the rim.
 */

/**
 * The rim's measurements. `height` is the whole rim, top to the lowest point of
 * its base. Making it taller slides the lower curve down and lengthens the
 * straight sides above it; the curve itself keeps its shape. `baseCorner` is the
 * radius of the rounded corners where the sides turn into the base. It has to be
 * less than `cornerRadius`. A smaller value gives the base a deeper curve and a
 * tighter corner.
 */
// [PLACEHOLDER] baseCorner is a first guess at how round the lower corners look.
const RIM = { x: 52, y: 144, width: 96, height: 24, cornerRadius: 10, baseCorner: 6 }

/** Round a number for path text: two decimals, no trailing zeros. */
const fmt = (n: number) => String(Math.round(n * 100) / 100)
const nums = (...n: number[]) => n.map(fmt).join(" ")

/**
 * A circular arc as one cubic curve, good for up to a quarter turn. Angles are
 * in radians with y pointing down, so a larger angle turns clockwise on screen.
 */
function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const k = (4 / 3) * Math.tan((to - from) / 4) * r
  const x0 = cx + r * Math.cos(from)
  const y0 = cy + r * Math.sin(from)
  const x3 = cx + r * Math.cos(to)
  const y3 = cy + r * Math.sin(to)
  return `C${nums(x0 - k * Math.sin(from), y0 + k * Math.cos(from), x3 + k * Math.sin(to), y3 - k * Math.cos(to), x3, y3)}`
}

/**
 * The rim's outline. The top corners are quarter circles, and the sides run
 * straight down from them. They turn into the base through smaller
 * quarter-circle corners, and the base is one large, gentle arc that is lowest in
 * the middle, at the bottom of the box. The corner circles touch the base circle
 * exactly, so the outline never turns sharply: its direction is the same on
 * both sides of every join. The lower curve always spans the last `cornerRadius`
 * units of the height, whatever the height is.
 */
function rimPath({ x, y, width, height, cornerRadius: r, baseCorner: rc }: typeof RIM): string {
  const right = x + width
  const middle = x + width / 2
  const bottom = y + height
  // Where the top corners end, and where the lower corners begin.
  const topCornersEnd = y + r
  const sidesEnd = bottom - r
  const depth = r
  if (rc >= depth) throw new RangeError("The rim's baseCorner has to be less than its cornerRadius")
  if (sidesEnd < topCornersEnd) throw new RangeError("The rim's height has to be at least twice its cornerRadius")
  // How far a lower corner's center is from the middle, across.
  const reach = width / 2 - rc
  // The base circle touches both corner circles from the outside and is lowest at `bottom`.
  const baseRadius = (rc * rc - depth * depth - reach * reach) / (2 * (rc - depth))
  const baseCenterY = bottom - baseRadius
  // The angle, around the base circle's center, where it touches a lower corner circle.
  const touch = Math.atan2(sidesEnd - baseCenterY, reach)
  return [
    `M${nums(x + r, y)}`,
    `L${nums(right - r, y)}`,
    arc(right - r, topCornersEnd, r, -Math.PI / 2, 0),
    ...(sidesEnd > topCornersEnd ? [`L${nums(right, sidesEnd)}`] : []),
    arc(right - rc, sidesEnd, rc, 0, touch),
    arc(middle, baseCenterY, baseRadius, touch, Math.PI - touch),
    arc(x + rc, sidesEnd, rc, Math.PI - touch, Math.PI),
    ...(sidesEnd > topCornersEnd ? [`L${nums(x, topCornersEnd)}`] : []),
    arc(x + r, topCornersEnd, r, Math.PI, 1.5 * Math.PI),
    "Z",
  ].join(" ")
}

export const POT_SHAPE = {
  /** The tapered body. Its outline is a path; its top edge is hidden behind the rim. */
  body: {
    // The base is one curve instead of a flat line: it starts at the wall's lowest corners (y 200) and dips to y 206, its lowest point. The control points sit at y 208 (a cubic curve reaches three quarters of the way to them).
    path: "M58 160 L142 160 L136 200 C136 208 64 208 64 200 Z",
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

  /** The rim on top of the body. `path` is its outline, drawn from the measurements above. */
  rim: { ...RIM, path: rimPath(RIM) },

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
