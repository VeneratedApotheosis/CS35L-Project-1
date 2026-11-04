export interface PotPalette {
  name: string
  /** Main color of the pot body. */
  body: string
  /** Rim, a little lighter than the body. */
  rim: string
  /** The shaded side of the body. */
  shade: string
  /** Stripe and dots. */
  band: string
}

/** The pot colors a plant can be given. Add a palette here and every plant can use it. */
export const POT_PALETTES: readonly PotPalette[] = [
  { name: "Terracotta", body: "#e08a5c", rim: "#eba078", shade: "#b9633c", band: "#f6d8a8" },
  { name: "Cream", body: "#f2e6c9", rim: "#faf1db", shade: "#cdbb94", band: "#e9a37d" },
  { name: "Sage", body: "#a9c9a0", rim: "#bfd9b6", shade: "#7fa37a", band: "#f6efd8" },
  { name: "Sky", body: "#8cc6e0", rim: "#a6d6ec", shade: "#5f9fbf", band: "#fff3d6" },
  { name: "Blush", body: "#f1a7b5", rim: "#f7bcc7", shade: "#cf7d90", band: "#fff3d6" },
]

/** The decorations a pot can be drawn with. */
export type PotBand = "none" | "stripe" | "dots"

/** The decorations a plant can be given. Add a name here once the pot can draw it. */
export const POT_BANDS: readonly PotBand[] = ["none", "stripe", "dots"]
