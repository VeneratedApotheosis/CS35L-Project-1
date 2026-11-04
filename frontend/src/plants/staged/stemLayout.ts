import { rad } from "../geometry"
import { lerp } from "../rng"
import { domeAtScale, domeValue } from "./dome"
import type { Gene } from "./genes"
import type { PlacedLeaf, StagedPlantSpecies } from "./types"

/**
 * Hang one leaf from its stem.
 *
 * The stem starts at the leaf's spot across the pot and runs up along its
 * heading for a length set by the leaf's layer. If the leaf would leave the
 * dome or dip below the soil line, the stem is shortened a little and tried
 * again. If it still does not fit once the stem is as short as it may go, the
 * leaf itself is shortened and the whole fit starts over.
 *
 * @param scale       the stage's envelope scale
 * @param baseLength  the stage's leaf length before this leaf's own factor
 */
export function placeLeaf<Spec>(
  gene: Gene<Spec>,
  scale: number,
  baseLength: number,
  species: StagedPlantSpecies<Spec>,
): PlacedLeaf<Spec> {
  const { config } = species
  const { stems, leaves, search, pot, roots } = config
  const dome = domeAtScale(config, scale)
  const { anchor } = dome
  const h = dome.height

  const rootX = anchor.x + (gene.rootShare - roots.middle) * (pot.rimRight - pot.rimLeft) * scale
  const rootY = anchor.y
  const heading = rad(gene.heading)
  const dirX = Math.sin(heading)
  const dirY = -Math.cos(heading)
  const angle = gene.heading + gene.curl + gene.jitter
  const a = rad(angle)
  const cos = Math.cos(a)
  const sin = Math.sin(a)

  let length = baseLength * gene.lengthFactor
  for (let attempt = 0; attempt < search.fitAttempts; attempt++) {
    // The highest layer reaches as far as the leaf still fits under the top of
    // the dome, so layers keep their spacing at every stage and leaf size.
    const lowest = stems.lengthRange[0] * h
    const headroom = Math.max(lowest, h * stems.headroomShare - length * stems.leafHeadroomShare)
    const highest = Math.min(headroom, stems.lengthRange[1] * h * stems.reachMultiplier)
    const fullStem = lerp(lowest, highest, gene.layer)

    // The stem may shrink to a floor; after that the leaf shrinks instead.
    const floor = Math.max(stems.minLength * h, fullStem * stems.shrinkFloor)
    let stem = fullStem
    for (let step = 0; step < search.stemSteps && stem >= floor; step++) {
      const baseX = rootX + dirX * stem
      const baseY = rootY + dirY * stem

      let lowestPoint = -Infinity
      let farthestOut = 0
      for (const [px, py] of gene.fitOutline) {
        const lx = px * length
        const ly = py * length
        const x = baseX + lx * cos - ly * sin
        const y = baseY + lx * sin + ly * cos
        if (y > lowestPoint) lowestPoint = y
        const out = domeValue(dome, x, y)
        if (out > farthestOut) farthestOut = out
      }
      if (lowestPoint <= anchor.y && farthestOut <= 1) {
        return describePlacement(gene, species, rootX, rootY, stem, heading, length, angle)
      }
      stem *= stems.shrinkStep
    }
    length *= leaves.shrinkStep
  }
  // Nothing fit: settle for the shortest stem and the shortest leaf tried.
  return describePlacement(gene, species, rootX, rootY, stems.minLength * h, heading, length, angle)
}

function describePlacement<Spec>(
  gene: Gene<Spec>,
  species: StagedPlantSpecies<Spec>,
  rootX: number,
  rootY: number,
  stem: number,
  heading: number,
  length: number,
  angle: number,
): PlacedLeaf<Spec> {
  const { config, leaf } = species
  const baseX = rootX + Math.sin(heading) * stem
  const baseY = rootY - Math.cos(heading) * stem
  const a = rad(angle)

  // The stem rises along its heading, then bends toward the leaf. The bend
  // point is kept above the soil line.
  const bendX = rootX + Math.sin(heading) * stem * config.stems.bendPoint
  const bendY = Math.min(config.dome.anchor.y, rootY - Math.cos(heading) * stem * config.stems.bendPoint)

  return {
    index: gene.index,
    spec: gene.spec,
    angle,
    length,
    baseX,
    baseY,
    centerX: baseX + Math.sin(a) * leaf.middle * length,
    centerY: baseY - Math.cos(a) * leaf.middle * length,
    z: gene.drawOrder,
    stem: { x0: rootX, y0: rootY, cx: bendX, cy: bendY, x1: baseX, y1: baseY },
  }
}
