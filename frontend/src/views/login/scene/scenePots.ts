import { POT_PALETTES, potLookFromSeed, type PotLook, type PotPalette } from "@/pottedPlant/pots"
import type { ScenePlant, ScenePotColor } from "./types"

/**
 * The pot colors the login scene uses. The first five are the app's own palettes;
 * the others (clay, slate, charcoal, navy, teal, mustard) exist only here, so
 * the greenhouse can have the dark and bright pots of the reference picture
 * without touching the palettes that habits draw from.
 */
export const SCENE_POT_COLORS: Readonly<Record<ScenePotColor, PotPalette>> = {
  terracotta: POT_PALETTES[0],
  cream: POT_PALETTES[1],
  sage: POT_PALETTES[2],
  sky: POT_PALETTES[3],
  blush: POT_PALETTES[4],
  clay: { name: "Clay", body: "#b86f43", rim: "#cd8559", shade: "#8f4f2c", band: "#f0cf9d" },
  slate: { name: "Slate", body: "#5b6a70", rim: "#73848b", shade: "#43515a", band: "#b7c6c9" },
  charcoal: { name: "Charcoal", body: "#3f4448", rim: "#565c61", shade: "#2c3033", band: "#9aa3a8" },
  navy: { name: "Navy", body: "#324f86", rim: "#4a67a1", shade: "#233a66", band: "#c9d6f0" },
  teal: { name: "Teal", body: "#3f948e", rim: "#58aca5", shade: "#2d706b", band: "#d4efe9" },
  mustard: { name: "Mustard", body: "#e2b24f", rim: "#edc671", shade: "#b88a2f", band: "#fff0c8" },
}

export const SCENE_POT_COLOR_NAMES = Object.keys(SCENE_POT_COLORS) as ScenePotColor[]

/** The pot to draw for a plant: its own seed's look, with whatever the plant overrides. */
export function resolvePot(plant: ScenePlant): PotLook {
  const base = potLookFromSeed(plant.pot?.seed ?? plant.seed)
  const look: PotLook = {
    ...base,
    band: plant.pot?.band ?? base.band,
    finish: plant.pot?.finish ?? base.finish,
  }
  if (plant.pot?.color) look.colors = SCENE_POT_COLORS[plant.pot.color]
  return look
}
